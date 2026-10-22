import type { AnnotationSessionV2, AudioAsset, DerivedSample, EmotionTarget, Locale, RatingEvent, RecordingPass } from './types';
import { defaultVAInterface, parseVAInterfaceProfile, type VAInterfaceProfile } from './va-config.ts';

const MAX_DURATION_SECONDS = 1800;
const EPSILON = 1e-9;
const id = () => crypto.randomUUID();
const stamp = () => new Date().toISOString();
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function changed(session: AnnotationSessionV2, passes: RecordingPass[]): AnnotationSessionV2 {
  return { ...session, passes, updatedAt: stamp(), revision: session.revision + 1 };
}

function mediaTime(session: AnnotationSessionV2, time: number): number {
  if (!Number.isFinite(time)) throw new Error('Media time must be finite.');
  return clamp(time, 0, session.asset.duration);
}

/** Strict UTC wall-clock timestamp; preserve the supplied precision instead of rewriting historical values. */
export function isUtcTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 19) === value.slice(0, 19);
}

export function createSession(asset: AudioAsset, locale: Locale, target: EmotionTarget, mode: AnnotationSessionV2['mode'] = 'free', interfaceProfile: VAInterfaceProfile = defaultVAInterface): AnnotationSessionV2 {
  if (!Number.isFinite(asset.duration) || asset.duration <= 0 || asset.duration > MAX_DURATION_SECONDS) {
    throw new Error('Audio duration must be greater than zero and no longer than 30 minutes.');
  }
  const now = stamp();
  return {
    schemaVersion: 2, id: id(), createdAt: now, updatedAt: now, mode, locale, emotionTarget: target,
    asset: { ...asset }, ...(asset.studyId ? { studyId: asset.studyId } : {}), notes: '', revision: 0,
    protocol: { scale: [0, 1], sampleRateHz: 10, resampling: 'zero_order_hold', version: 1 },
    interfaceProfile: structuredClone(parseVAInterfaceProfile(interfaceProfile)), passes: [],
  };
}

export function startPass(session: AnnotationSessionV2, time: number): AnnotationSessionV2 {
  const start = mediaTime(session, time);
  if (start >= session.asset.duration || session.passes.some(pass => !pass.revoked && pass.end === null)) return session;
  const order = session.passes.reduce((max, pass) => Math.max(max, pass.order), -1) + 1;
  const pass: RecordingPass = { id: id(), order, start, end: null, events: [], revoked: false };
  return changed(session, [...session.passes, pass]);
}

export function addRating(session: AnnotationSessionV2, time: number, monotonicTime: number, valence: number, arousal: number, input: RatingEvent['input']): AnnotationSessionV2 {
  if (![time, monotonicTime, valence, arousal].every(Number.isFinite) || monotonicTime < 0) return session;
  const index = session.passes.findIndex(pass => !pass.revoked && pass.end === null);
  if (index === -1) return session;
  const pass = session.passes[index];
  const last = pass.events[pass.events.length - 1];
  // A seek must finish a pass before recording resumes; never reorder incoming observations.
  if (time < pass.start || time > session.asset.duration || (last && (time < last.mediaTime || monotonicTime < last.monotonicTime))) return session;
  const utcTimestamp = stamp();
  const event: RatingEvent = { id: id(), sequence: (last?.sequence ?? -1) + 1, mediaTime: time, monotonicTime, utcTimestamp, valence: clamp(valence), arousal: clamp(arousal), input };
  const passes = session.passes.slice();
  passes[index] = { ...pass, events: [...pass.events, event] };
  return changed(session, passes);
}

export function closePass(session: AnnotationSessionV2, time: number, reason: NonNullable<RecordingPass['endReason']>): AnnotationSessionV2 {
  const end = mediaTime(session, time);
  const index = session.passes.findIndex(pass => !pass.revoked && pass.end === null);
  if (index === -1) return session;
  const passes = session.passes.slice();
  passes[index] = { ...passes[index], end: Math.max(passes[index].start, end), endReason: reason };
  return changed(session, passes);
}

export function undoPass(session: AnnotationSessionV2): AnnotationSessionV2 {
  let index = -1;
  session.passes.forEach((pass, i) => { if (!pass.revoked && (index < 0 || pass.order > session.passes[index].order)) index = i; });
  if (index < 0) return session;
  const passes = session.passes.slice();
  const pass = passes[index];
  passes[index] = { ...pass, revoked: true, end: pass.end ?? pass.events[pass.events.length - 1]?.mediaTime ?? pass.start };
  return changed(session, passes);
}

type Interval = { start: number; end: number; pass: RecordingPass | null };
type ActivePass = { pass: RecordingPass; start: number; end: number };

function effectiveEnd(pass: RecordingPass): number {
  // No wall-clock extrapolation: callers may close a temporary copy at currentTime for a live preview.
  return pass.end ?? pass.events[pass.events.length - 1]?.mediaTime ?? pass.start;
}

/** Resolve overwrite boundaries before sampling, including edits between adjacent 10 Hz ticks. */
function resolvedIntervals(session: AnnotationSessionV2): Interval[] {
  const duration = session.asset.duration;
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const passes: ActivePass[] = session.passes.filter(pass => !pass.revoked).map(pass => ({
    pass, start: clamp(pass.start, 0, duration), end: clamp(effectiveEnd(pass), 0, duration),
  })).filter(pass => pass.end > pass.start).sort((a, b) => a.start - b.start || a.pass.order - b.pass.order);
  const boundaries = [...new Set([0, duration, ...passes.flatMap(pass => [pass.start, pass.end])])].sort((a, b) => a - b);
  const heap: ActivePass[] = [];
  function push(value: ActivePass) {
    heap.push(value);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >>> 1;
      if (heap[parent].pass.order >= value.pass.order) break;
      heap[i] = heap[parent]; i = parent;
    }
    heap[i] = value;
  }
  function pop() {
    const tail = heap.pop();
    if (!heap.length || !tail) return;
    let i = 0;
    while (i * 2 + 1 < heap.length) {
      let child = i * 2 + 1;
      if (child + 1 < heap.length && heap[child + 1].pass.order > heap[child].pass.order) child += 1;
      if (heap[child].pass.order <= tail.pass.order) break;
      heap[i] = heap[child]; i = child;
    }
    heap[i] = tail;
  }
  const intervals: Interval[] = [];
  let next = 0;
  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const start = boundaries[i], end = boundaries[i + 1];
    while (next < passes.length && passes[next].start <= start) push(passes[next++]);
    while (heap.length && heap[0].end <= start) pop();
    const pass = heap[0]?.pass ?? null;
    const previous = intervals[intervals.length - 1];
    if (previous && previous.pass === pass && previous.end === start) previous.end = end;
    else intervals.push({ start, end, pass });
  }
  return intervals;
}

/** Last original event at or before the media timestamp; equal-time observations use the latest sequence. */
function lastEventIndex(events: RatingEvent[], time: number): number {
  let left = 0, right = events.length;
  while (left < right) {
    const middle = (left + right) >>> 1;
    if (events[middle].mediaTime <= time) left = middle + 1;
    else right = middle;
  }
  return left - 1;
}

export function deriveSamples(session: AnnotationSessionV2): DerivedSample[] {
  const intervals = resolvedIntervals(session);
  if (!intervals.length) return [];
  const samples: DerivedSample[] = [];
  const count = Math.ceil(session.asset.duration * session.protocol.sampleRateHz);
  let index = 0;
  for (let i = 0; i < count; i += 1) {
    const time = i / session.protocol.sampleRateHz;
    while (index < intervals.length - 1 && intervals[index].end <= time) index += 1;
    const pass = intervals[index].pass;
    const eventIndex = pass ? lastEventIndex(pass.events, time) : -1;
    const event = pass && eventIndex >= 0 ? pass.events[eventIndex] : null;
    const valid = !!event && event.mediaTime >= pass!.start && event.mediaTime < effectiveEnd(pass!);
    samples.push({
      mediaTime: time, valence: valid ? event!.valence : null, arousal: valid ? event!.arousal : null,
      sourceEventId: valid ? event!.id : null, passId: pass?.id ?? null,
      valueOrigin: valid ? (Math.abs(event!.mediaTime - time) < EPSILON ? 'new_event' : 'held') : 'missing',
    });
  }
  return samples;
}

/** Coverage is exact valid time / audio duration, not a rounded count of grid samples. */
export function sessionStats(session: AnnotationSessionV2): { coverage: number; eventCount: number; passCount: number } {
  let validDuration = 0;
  for (const interval of resolvedIntervals(session)) {
    if (!interval.pass) continue;
    const events = interval.pass.events;
    const previousIndex = lastEventIndex(events, interval.start);
    const previous = previousIndex >= 0 ? events[previousIndex] : null;
    const first = previous && previous.mediaTime >= interval.pass.start ? previous : events[previousIndex + 1];
    if (first && first.mediaTime >= interval.pass.start && first.mediaTime < interval.end) validDuration += interval.end - Math.max(first.mediaTime, interval.start);
  }
  return {
    coverage: session.asset.duration > 0 ? clamp(validDuration / session.asset.duration) : 0,
    // All original events remain auditable, including those in revoked or overwritten passes.
    eventCount: session.passes.reduce((count, pass) => count + pass.events.length, 0),
    passCount: session.passes.filter(pass => !pass.revoked && effectiveEnd(pass) > pass.start).length,
  };
}
