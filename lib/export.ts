import { deriveSamples, sessionStats } from './annotation.ts';
import type { AnnotationSessionV2, AudioAsset, RatingEvent, RecordingPass } from './types';

type LegacySource = { timestamp?: string; totalRatings?: number; ratings: unknown[] };
type WithLegacySource = AnnotationSessionV2 & { legacySource?: LegacySource };
const MAX_IMPORT_CHARACTERS = 100 * 1024 * 1024;
const INPUTS = ['pointer', 'keyboard', 'slider', 'legacy'] as const;
const REASONS = ['stop', 'pause', 'seek', 'ended', 'hidden', 'buffering', 'interrupted', 'error'] as const;
const fail = (message: string): never => { throw new Error(`Invalid annotation file: ${message}`); };
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max = 1000): string {
  if (typeof value !== 'string' || value.length > max) fail(`${label} must be text of at most ${max} characters.`);
  return value as string;
}
function number(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(`${label} is outside its valid range.`);
  return value as number;
}
function integer(value: unknown, label: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const result = number(value, label, min, max);
  if (!Number.isSafeInteger(result)) fail(`${label} must be an integer.`);
  return result;
}
function date(value: unknown, label: string): string {
  const result = text(value, label, 50);
  if (!Number.isFinite(Date.parse(result))) fail(`${label} must be an ISO date.`);
  return new Date(result).toISOString();
}
function uniqueId(value: unknown, label: string, ids: Set<string>): string {
  const result = text(value, label, 200);
  if (!result.trim() || ids.has(result)) fail(`${label} must be a unique nonempty identifier.`);
  ids.add(result); return result;
}
function optionalText(source: Record<string, unknown>, key: string, max = 1000): string | undefined {
  return source[key] === undefined ? undefined : text(source[key], key, max);
}

/** JSON is an auditable snapshot: raw events + pass history + independently labelled derived samples. */
export function sessionToJson(session: AnnotationSessionV2): string {
  const asset = { ...session.asset };
  // Browser object URLs expire with the tab and are not an audio identity or a reusable media link.
  if (asset.url?.startsWith('blob:')) delete asset.url;
  return JSON.stringify({
    ...session, asset, exportedAt: new Date().toISOString(),
    dataDescription: {
      mediaTimeUnit: 'seconds', inputScale: [0, 1], rawInput: 'passes[].events',
      derivedSeries: '10 Hz, zero-order hold within the latest non-revoked half-open recording pass; null means missing',
      openPasses: 'Only observed media time is included; no future hold is inferred.',
      legacy: session.legacy ? 'Original audio identity, duration, target and monotonic clock are unknown; monotonicTime=0 is a placeholder. No continuous coverage is inferred.' : undefined,
    },
    summary: sessionStats(session), derivedSamples: deriveSamples(session),
  }, null, 2);
}

/** Quote RFC 4180 fields and neutralize formulas when opened in spreadsheet software. */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let safe = value;
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(safe) || /^[\t\r\n]/.test(safe)) safe = `'${safe}`;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function sessionToCsv(session: AnnotationSessionV2): string {
  const rows: (string | number | null | undefined)[][] = [[
    'record_type', 'session_id', 'asset_id', 'asset_name', 'study_id', 'study_version', 'participant_id',
    'research_code', 'emotion_target', 'media_time_seconds', 'valence_0_1', 'arousal_0_1', 'value_origin', 'source_event_id', 'pass_id',
  ]];
  const prefix = [session.id, session.asset.id, session.asset.name, session.studyId, session.studyVersion, session.participantId, session.researchCode, session.emotionTarget];
  if (session.legacy && session.asset.duration === 0) {
    for (const pass of session.passes) for (const event of pass.events) rows.push(['raw_legacy', ...prefix, event.mediaTime, event.valence, event.arousal, 'new_event', event.id, pass.id]);
  } else {
    for (const sample of deriveSamples(session)) rows.push(['derived_10hz', ...prefix, sample.mediaTime, sample.valence, sample.arousal, sample.valueOrigin, sample.sourceEventId, sample.passId]);
  }
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function importLegacy(source: Record<string, unknown>): AnnotationSessionV2 {
  if (!Array.isArray(source.ratings) || source.ratings.length > 1_000_000) fail('legacy ratings must be an array of at most 1,000,000 items.');
  const ratings = source.ratings as unknown[];
  const now = new Date().toISOString();
  const events: RatingEvent[] = ratings.map((value, index) => {
    const event = object(value, `ratings[${index}]`);
    return {
      id: crypto.randomUUID(), sequence: index, mediaTime: number(event.timestamp, 'legacy timestamp', 0, 86400),
      monotonicTime: 0, valence: number(event.valence, 'legacy valence', 0, 1), arousal: number(event.arousal, 'legacy arousal', 0, 1), input: 'legacy',
    };
  });
  const original: LegacySource = { ratings };
  if (typeof source.timestamp === 'string') original.timestamp = source.timestamp;
  if (typeof source.totalRatings === 'number') original.totalRatings = source.totalRatings;
  const session: WithLegacySource = {
    schemaVersion: 2, id: crypto.randomUUID(), createdAt: now, updatedAt: now, mode: 'legacy', locale: 'zh-CN', emotionTarget: 'unknown',
    asset: { id: `legacy-unknown-${crypto.randomUUID()}`, name: 'Unknown audio / 未知音频', size: 0, mimeType: '', duration: 0 },
    notes: 'Imported legacy point observations. Audio identity, duration, emotion target and monotonic timing are unknown. No continuous coverage is inferred.',
    revision: 0, protocol: { scale: [0, 1], sampleRateHz: 10, resampling: 'zero_order_hold', version: 1 }, legacy: true, legacySource: original,
    passes: [{ id: crypto.randomUUID(), order: 0, start: 0, end: 0, revoked: false, events, endReason: 'stop' }],
  };
  return session;
}

/** Validate before accepting imported snapshots; derive data afresh instead of trusting exported summaries. */
export function importSession(contents: string): AnnotationSessionV2 {
  if (contents.length > MAX_IMPORT_CHARACTERS) fail('file exceeds the 100 MB import limit.');
  let value: unknown;
  try { value = JSON.parse(contents); } catch { fail('JSON could not be parsed.'); }
  const source = object(value, 'session');
  if (source.schemaVersion === undefined && Array.isArray(source.ratings)) return importLegacy(source);
  if (source.schemaVersion !== 2) fail('unsupported schema version.');
  if (!['free', 'research', 'legacy'].includes(source.mode as string)) fail('unsupported session mode.');
  if (!['en', 'zh-CN'].includes(source.locale as string)) fail('unsupported locale.');
  if (!['perceived', 'felt', 'unknown'].includes(source.emotionTarget as string)) fail('unsupported emotion target.');
  const isLegacy = source.legacy === true && source.mode === 'legacy';
  if (source.emotionTarget === 'unknown' && !isLegacy) fail('only imported legacy sessions may have an unknown target.');
  const assetSource = object(source.asset, 'asset');
  const duration = number(assetSource.duration, 'audio duration', isLegacy ? 0 : Number.MIN_VALUE, 1800);
  const asset: AudioAsset = {
    id: text(assetSource.id, 'asset ID', 200), name: text(assetSource.name, 'asset name'), size: integer(assetSource.size, 'asset size'),
    mimeType: text(assetSource.mimeType, 'MIME type', 200), duration,
  };
  if (!asset.id.trim()) fail('asset ID must not be empty.');
  if (assetSource.sha256 !== undefined) {
    const hash = text(assetSource.sha256, 'audio SHA-256', 64);
    if (!/^[a-f\d]{64}$/i.test(hash)) fail('audio SHA-256 must be a 64-character hexadecimal hash.');
    asset.sha256 = hash.toLowerCase();
  }
  if (assetSource.url !== undefined) {
    const url = text(assetSource.url, 'audio URL', 4000);
    if (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url)) asset.url = url;
  }
  if (assetSource.studyId !== undefined) asset.studyId = text(assetSource.studyId, 'asset study ID', 200);
  if (assetSource.status === 'pending' || assetSource.status === 'ready') asset.status = assetSource.status;
  const protocol = object(source.protocol, 'protocol');
  if (!Array.isArray(protocol.scale) || protocol.scale.length !== 2 || protocol.scale[0] !== 0 || protocol.scale[1] !== 1 || protocol.sampleRateHz !== 10 || protocol.resampling !== 'zero_order_hold' || protocol.version !== 1) fail('unsupported annotation protocol.');
  if (!Array.isArray(source.passes) || source.passes.length > 10_000) fail('passes must be an array of at most 10,000 items.');
  const ids = new Set<string>(), orders = new Set<number>();
  let eventCount = 0, openCount = 0;
  const passes: RecordingPass[] = (source.passes as unknown[]).map((value, index) => {
    const pass = object(value, `passes[${index}]`);
    const order = integer(pass.order, 'pass order');
    if (orders.has(order)) fail('pass orders must be unique.');
    orders.add(order);
    const start = number(pass.start, 'pass start', 0, duration);
    const end = pass.end === null ? null : number(pass.end, 'pass end', start, duration);
    if (typeof pass.revoked !== 'boolean') fail('pass revoked must be boolean.');
    if (end === null && !pass.revoked) openCount += 1;
    if (openCount > 1) fail('only one pass can be recording at a time.');
    if (!Array.isArray(pass.events)) fail('events must be an array.');
    eventCount += (pass.events as unknown[]).length;
    if (eventCount > 1_000_000) fail('too many raw events.');
    let previousTime = -1, previousSequence = -1, previousClock = -1;
    const events: RatingEvent[] = (pass.events as unknown[]).map((value, index) => {
      const event = object(value, `event[${index}]`);
      const time = number(event.mediaTime, 'event media time', isLegacy ? 0 : start, isLegacy ? 86400 : duration);
      const sequence = integer(event.sequence, 'event sequence');
      const monotonicTime = number(event.monotonicTime, 'event monotonic time', 0, Number.MAX_VALUE);
      if (sequence <= previousSequence || (!isLegacy && (time < previousTime || monotonicTime < previousClock))) fail('raw events must preserve monotonic sequence and media time within each pass.');
      previousTime = time; previousSequence = sequence; previousClock = monotonicTime;
      if (!INPUTS.includes(event.input as RatingEvent['input'])) fail('unsupported event input.');
      return { id: uniqueId(event.id, 'event ID', ids), sequence, mediaTime: time, monotonicTime, valence: number(event.valence, 'valence', 0, 1), arousal: number(event.arousal, 'arousal', 0, 1), input: event.input as RatingEvent['input'] };
    });
    const result: RecordingPass = { id: uniqueId(pass.id, 'pass ID', ids), order, start, end, events, revoked: pass.revoked as boolean };
    if (pass.endReason !== undefined) {
      if (!REASONS.includes(pass.endReason as NonNullable<RecordingPass['endReason']>)) fail('unsupported pass end reason.');
      result.endReason = pass.endReason as RecordingPass['endReason'];
    }
    return result;
  });
  const result: WithLegacySource = {
    schemaVersion: 2, id: uniqueId(source.id, 'session ID', ids), createdAt: date(source.createdAt, 'createdAt'), updatedAt: date(source.updatedAt, 'updatedAt'),
    mode: source.mode as AnnotationSessionV2['mode'], locale: source.locale as AnnotationSessionV2['locale'], emotionTarget: source.emotionTarget as AnnotationSessionV2['emotionTarget'],
    asset, notes: text(source.notes, 'notes', 20_000), revision: integer(source.revision, 'revision'),
    protocol: { scale: [0, 1], sampleRateHz: 10, resampling: 'zero_order_hold', version: 1 }, passes,
  };
  for (const key of ['studyId', 'participantId', 'researchCode'] as const) {
    const value = optionalText(source, key, key === 'researchCode' ? 1000 : 200);
    if (value !== undefined) result[key] = value;
  }
  if (source.studyVersion !== undefined) result.studyVersion = integer(source.studyVersion, 'study version', 1);
  if (isLegacy) {
    result.legacy = true;
    if (source.legacySource !== undefined) {
      const legacy = object(source.legacySource, 'legacy source');
      if (!Array.isArray(legacy.ratings)) fail('legacy source ratings must be an array.');
      const original: LegacySource = { ratings: legacy.ratings as unknown[] };
      if (typeof legacy.timestamp === 'string') original.timestamp = legacy.timestamp;
      if (typeof legacy.totalRatings === 'number') original.totalRatings = legacy.totalRatings;
      result.legacySource = original;
    }
  }
  return result;
}
