import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { addRating, closePass, createSession, deriveSamples, isUtcTimestamp, sessionStats, startPass, undoPass } from '../lib/annotation.ts';
import { csvCell, importSession, sessionToCsv, sessionToJson } from '../lib/export.ts';
import type { AnnotationSessionV2, RatingEvent, RecordingPass } from '../lib/types.ts';
import { defaultVAInterface } from '../lib/va-config.ts';

const fresh = (duration = 1) => createSession({ id: 'audio-1', name: 'Example.wav', size: 123, duration, mimeType: 'audio/wav', sha256: 'a'.repeat(64) }, 'en', 'perceived');
const record = (session: AnnotationSessionV2, start: number, end: number, events: [number, number, number][]) => {
  let next = startPass(session, start);
  for (const [time, v, a] of events) next = addRating(next, time, time * 1000, v, a, 'pointer');
  return closePass(next, end, 'stop');
};
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) freeze(child); }
  return value;
}

test('raw input is immutable, finite, clamped and never prefills the first event', () => {
  const initial = freeze(fresh());
  const started = freeze(startPass(initial, 0));
  const rated = freeze(addRating(started, 0.25, 200, -1, 2, 'pointer'));
  assert.equal(initial.passes.length, 0);
  assert.equal(started.passes[0].events.length, 0);
  assert.deepEqual([rated.passes[0].events[0].valence, rated.passes[0].events[0].arousal], [0, 1]);
  assert.equal(addRating(rated, NaN, 300, 0.5, 0.5, 'pointer'), rated);
  assert.equal(addRating(rated, 0.1, 300, 0.5, 0.5, 'pointer'), rated);
  assert.equal(addRating(rated, 0.3, 100, 0.5, 0.5, 'pointer'), rated);
  const closed = closePass(rated, 0.8, 'pause');
  const samples = deriveSamples(closed);
  assert.equal(samples.length, 10);
  assert.deepEqual(samples.slice(0, 3).map(row => row.valence), [null, null, null]);
  assert.equal(samples[3].valueOrigin, 'held');
  assert.deepEqual(samples.slice(8).map(row => row.valence), [null, null]);
  assert.ok(Math.abs(sessionStats(closed).coverage - 0.55) < 1e-12);
});

test('accepted inputs capture UTC at the input boundary and held CSV rows retain that source time', context => {
  context.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-22T08:00:00.123Z') });
  try {
    let session = startPass(fresh(0.5), 0);
    session = addRating(session, 0.1, 10, 0.2, 0.3, 'pointer');
    context.mock.timers.tick(173);
    session = addRating(session, 0.3, 183, 0.8, 0.7, 'keyboard');
    session = closePass(session, 0.5, 'stop');
    assert.deepEqual(session.passes[0].events.map(event => event.utcTimestamp), ['2026-10-22T08:00:00.123Z', '2026-10-22T08:00:00.296Z']);
    const rows = sessionToCsv(session).trim().split('\r\n').map(row => row.split(','));
    assert.equal(rows[0].at(-1), '"source_event_utc_timestamp"');
    assert.equal(rows[1].at(-1), '');
    assert.equal(rows[2].at(-1), '"2026-10-22T08:00:00.123Z"');
    assert.equal(rows[3].at(-1), rows[2].at(-1));
    assert.equal(rows[4].at(-1), '"2026-10-22T08:00:00.296Z"');
    assert.deepEqual(importSession(sessionToJson(session)), session);
  } finally { context.mock.timers.reset(); }
});

test('sessions freeze a validated interface snapshot independent of default or caller changes', () => {
  const custom = structuredClone(defaultVAInterface);
  custom.config.guide.diameterRatio = 0.4;
  custom.config.axes.x.name.en = 'Custom valence';
  const session = createSession(fresh().asset, 'en', 'perceived', 'free', custom);
  assert.deepEqual(session.interfaceProfile, custom);
  assert.notEqual(session.interfaceProfile, custom);
  assert.notEqual(session.interfaceProfile?.tags, custom.tags);
  custom.config.guide.diameterRatio = 0.7;
  custom.tags[0].label.en = 'Changed later';
  assert.equal(session.interfaceProfile?.config.guide.diameterRatio, 0.4);
  assert.notEqual(session.interfaceProfile?.tags[0].label.en, 'Changed later');
  assert.deepEqual(importSession(sessionToJson(session)).interfaceProfile, session.interfaceProfile);
  const ordinary = fresh();
  assert.deepEqual(ordinary.interfaceProfile, defaultVAInterface);
  assert.notEqual(ordinary.interfaceProfile?.config, defaultVAInterface.config);
  const invalid = structuredClone(defaultVAInterface); invalid.config.guide.diameterRatio = 0;
  assert.throws(() => createSession(fresh().asset, 'en', 'perceived', 'free', invalid));
  assert.throws(() => importSession(JSON.stringify({ ...session, interfaceProfile: invalid })));
});

test('old v2 snapshots keep missing UTC and profile unknown; valid original UTC precision is preserved', () => {
  const current = record(fresh(), 0, 1, [[0.2, 0.3, 0.4]]);
  delete current.interfaceProfile;
  delete current.passes[0].events[0].utcTimestamp;
  const restored = importSession(sessionToJson(current));
  assert.equal(Object.hasOwn(restored, 'interfaceProfile'), false);
  assert.equal(Object.hasOwn(restored.passes[0].events[0], 'utcTimestamp'), false);
  assert.equal(sessionToCsv(restored).trim().split('\r\n')[3].split(',').at(-1), '');
  current.passes[0].events[0].utcTimestamp = '2026-10-22T08:00:00.123456789Z';
  assert.equal(importSession(sessionToJson(current)).passes[0].events[0].utcTimestamp, '2026-10-22T08:00:00.123456789Z');
});

test('invalid UTC dates, local times and malformed interface profiles are rejected', () => {
  const session = record(fresh(), 0, 1, [[0.2, 0.3, 0.4]]);
  for (const timestamp of ['2026-02-30T08:00:00Z', '2026-10-22T25:00:00Z', '2026-10-22T08:00:00', '2026-10-22T08:00:00+08:00', '', null, 123]) {
    assert.equal(isUtcTimestamp(timestamp), false);
    const invalid = structuredClone(session);
    Reflect.set(invalid.passes[0].events[0], 'utcTimestamp', timestamp);
    assert.throws(() => importSession(JSON.stringify(invalid)));
    assert.throws(() => importSession(JSON.stringify({ ratings: [{ timestamp: 0, valence: 0.2, arousal: 0.3, utcTimestamp: timestamp }] })));
  }
  assert.equal(isUtcTimestamp('2024-02-29T08:00:00Z'), true);
  for (const profile of [null, {}, { ...defaultVAInterface, extra: true }]) assert.throws(() => importSession(JSON.stringify({ ...session, interfaceProfile: profile })));
});

test('equal-time events retain both observations but the latest drives the sampled value', () => {
  let session = startPass(fresh(), 0);
  session = addRating(session, 0.2, 100, 0.1, 0.2, 'keyboard');
  session = addRating(session, 0.2, 101, 0.8, 0.9, 'slider');
  session = closePass(session, 1, 'ended');
  const samples = deriveSamples(session);
  assert.equal(session.passes[0].events.length, 2);
  assert.equal(samples[2].valence, 0.8);
  assert.equal(samples[2].valueOrigin, 'new_event');
  assert.equal(samples[3].valueOrigin, 'held');
  assert.equal(samples[3].sourceEventId, session.passes[0].events[1].id);
});

test('half-open new pass overrides only its own range, including missing values', () => {
  let session = record(fresh(), 0, 1, [[0, 0.2, 0.3], [0.5, 0.4, 0.6]]);
  const baseline = session;
  session = record(session, 0.3, 0.7, [[0.45, 0.9, 0.8]]);
  const samples = deriveSamples(session);
  assert.deepEqual(samples.map(row => row.valence), [0.2, 0.2, 0.2, null, null, 0.9, 0.9, 0.4, 0.4, 0.4]);
  assert.ok(Math.abs(sessionStats(session).coverage - 0.85) < 1e-12);
  assert.deepEqual(deriveSamples(undoPass(session)), deriveSamples(baseline));
  assert.equal(undoPass(session).passes[1].events.length, 1);
  assert.equal(session.passes[1].revoked, false);
});

test('boundaries between 10 Hz ticks resolve before sampling and coverage uses continuous time', () => {
  let session = record(fresh(), 0, 1, [[0, 0.2, 0.3]]);
  session = record(session, 0.095, 0.105, []);
  const samples = deriveSamples(session);
  assert.equal(samples[0].valence, 0.2);
  assert.equal(samples[1].valence, null);
  assert.equal(samples[2].valence, 0.2);
  assert.ok(Math.abs(sessionStats(session).coverage - 0.99) < 1e-12);
  session = record(session, 0.03, 0.07, []);
  assert.equal(deriveSamples(session)[0].valence, 0.2);
  assert.ok(Math.abs(sessionStats(session).coverage - 0.95) < 1e-12);
});

test('empty positive passes erase a region; zero-duration passes do not; undo walks history', () => {
  let session = record(fresh(), 0, 1, [[0, 0.7, 0.3]]);
  session = record(session, 0.2, 0.4, []);
  session = record(session, 0.7, 0.7, [[0.7, 0.1, 0.1]]);
  assert.equal(deriveSamples(session)[2].valence, null);
  assert.equal(deriveSamples(session)[7].valence, 0.7);
  assert.equal(sessionStats(session).passCount, 2);
  session = undoPass(session);
  assert.equal(deriveSamples(session)[2].valence, null);
  session = undoPass(session);
  assert.equal(deriveSamples(session)[2].valence, 0.7);
  session = undoPass(session);
  assert.equal(sessionStats(session).coverage, 0);
  assert.equal(sessionStats(session).eventCount, 2);
  assert.equal(undoPass(session), session);
});

test('open passes do not invent future time; previewing a closed snapshot leaves recording open', () => {
  let session = startPass(fresh(), 0);
  assert.equal(startPass(session, 0.4), session);
  session = addRating(session, 0.2, 200, 0.3, 0.4, 'pointer');
  assert.equal(sessionStats(session).coverage, 0);
  const preview = closePass(session, 0.6, 'stop');
  assert.ok(Math.abs(sessionStats(preview).coverage - 0.4) < 1e-12);
  assert.equal(session.passes[0].end, null);
  assert.equal(deriveSamples(preview)[6].valence, null);
});

test('media endpoint, unknown duration and unsupported audio limits are explicit', () => {
  assert.throws(() => fresh(0));
  assert.throws(() => fresh(1800.001));
  const session = fresh(0.25);
  assert.equal(startPass(session, 0.25), session);
  assert.deepEqual(deriveSamples(session).map(row => row.mediaTime), [0, 0.1, 0.2]);
  assert.throws(() => startPass(session, Infinity));
});

test('JSON snapshot round-trips raw history; derived input cannot spoof output', () => {
  let session = record(fresh(), 0, 1, [[0.2, 0.3, 0.8]]);
  session = record(session, 0.4, 0.6, []);
  const original = structuredClone(session);
  const json = sessionToJson(session);
  const exported = JSON.parse(json);
  exported.derivedSamples = [{ valence: 999 }];
  exported.summary.coverage = 1;
  const restored = importSession(JSON.stringify(exported));
  assert.deepEqual(restored, original);
  assert.deepEqual(deriveSamples(restored), deriveSamples(session));
  assert.deepEqual(session, original);
  session = { ...session, asset: { ...session.asset, url: 'blob:temporary-tab-url' } };
  assert.equal(JSON.parse(sessionToJson(session)).asset.url, undefined);
});

test('imports reject unsupported protocols, non-finite values and ambiguous raw ordering', () => {
  const session = record(fresh(), 0, 1, [[0.2, 0.3, 0.8], [0.3, 0.5, 0.5]]);
  function edited(update: (value: AnnotationSessionV2) => void) { const value = JSON.parse(sessionToJson(session)); update(value); return JSON.stringify(value); }
  assert.throws(() => importSession('{broken'));
  assert.throws(() => importSession(edited(value => Reflect.set(value.protocol, 'sampleRateHz', 100))));
  assert.throws(() => importSession(edited(value => value.asset.duration = 1801)));
  assert.throws(() => importSession(edited(value => Reflect.set(value.passes[0].events[0], 'valence', null))));
  assert.throws(() => importSession(edited(value => value.passes[0].events[1].mediaTime = 0.1)));
  assert.throws(() => importSession(edited(value => value.passes[0].events[1].id = value.passes[0].events[0].id)));
  assert.throws(() => importSession(edited(value => value.passes.push({ ...value.passes[0], id: 'duplicate-order' }))));
});

test('legacy point imports retain original source and never manufacture asset identity or coverage', () => {
  const legacy = {
    timestamp: '2021-07-01T00:00:00.000Z', totalRatings: 2,
    ratings: [
      { timestamp: 5, valence: 0.2, arousal: 0.8, emotions: ['sad'], utcTimestamp: '2021-07-01T00:00:00Z' },
      { timestamp: 2, valence: 0.7, arousal: 0.5, emotions: ['warm'] },
    ],
  };
  const restored = importSession(JSON.stringify(legacy));
  assert.equal(restored.mode, 'legacy');
  assert.equal(restored.emotionTarget, 'unknown');
  assert.equal(restored.asset.duration, 0);
  assert.equal(restored.asset.sha256, undefined);
  assert.deepEqual(restored.legacySource, legacy);
  assert.deepEqual(restored.passes[0].events.map(event => event.mediaTime), [5, 2]);
  assert.equal(restored.passes[0].events[0].utcTimestamp, '2021-07-01T00:00:00Z');
  assert.equal(Object.hasOwn(restored.passes[0].events[1], 'utcTimestamp'), false);
  assert.equal(restored.interfaceProfile, undefined);
  assert.deepEqual(deriveSamples(restored), []);
  assert.deepEqual(sessionStats(restored), { coverage: 0, eventCount: 2, passCount: 0 });
  assert.deepEqual(importSession(sessionToJson(restored)), restored);
  assert.match(sessionToCsv(restored), /raw_legacy/);
});

test('CSV exports separate held/missing values, escape quotes/newlines and neutralize formulas', () => {
  let session = record(fresh(0.4), 0, 0.3, [[0.1, 0.2, 0.7]]);
  session = { ...session, asset: { ...session.asset, name: '=HYPERLINK("https://example.test")\n音频' } };
  const csv = sessionToCsv(session);
  assert.ok(csv.includes('"\'=HYPERLINK(""https://example.test"")\n音频"'));
  assert.ok(csv.includes(',0,,,"missing",,'));
  assert.ok(csv.includes(',0.1,0.2,0.7,"new_event",'));
  assert.ok(csv.includes(',0.2,0.2,0.7,"held",'));
  assert.equal(csvCell('  @SUM(A1)'), '"\'  @SUM(A1)"');
  assert.equal(csvCell('normal, "quoted"'), '"normal, ""quoted"""');
});

test('sweep resolution matches an independent latest-pass oracle across randomized overlaps', () => {
  let seed = 123456;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  let session = fresh(10);
  for (let i = 0; i < 150; i += 1) {
    const start = random() * 9, end = Math.min(10, start + random() * 3);
    const time = start + random() * (end - start);
    session = record(session, start, end, random() > 0.3 ? [[time, random(), random()]] : []);
    if (random() > 0.85) session = undoPass(session);
  }
  for (const sample of deriveSamples(session)) {
    const pass = session.passes.filter(pass => !pass.revoked && pass.start <= sample.mediaTime && pass.end !== null && sample.mediaTime < pass.end).sort((a, b) => b.order - a.order)[0];
    const event = pass?.events.filter(event => event.mediaTime <= sample.mediaTime).at(-1);
    assert.equal(sample.passId, pass?.id ?? null);
    assert.equal(sample.sourceEventId, event?.id ?? null);
    assert.equal(sample.valence, event?.valence ?? null);
  }
});

test('30-minute high-frequency input and 1000 overlapping edits derive efficiently', () => {
  const session = fresh(1800);
  const events: RatingEvent[] = Array.from({ length: 108_000 }, (_, i) => ({
    id: `event-${i}`, sequence: i, mediaTime: i / 60, monotonicTime: i * (1000 / 60), valence: (i % 100) / 100, arousal: 0.5, input: 'pointer',
  }));
  const first: RecordingPass = { id: 'base-pass', order: 0, start: 0, end: 1800, events, revoked: false };
  session.passes = [first, ...Array.from({ length: 1000 }, (_, i) => ({
    id: `edit-${i}`, order: i + 1, start: i + 0.035, end: i + 0.065, events: [], revoked: false,
  }))];
  const start = performance.now();
  const samples = deriveSamples(session), stats = sessionStats(session);
  const elapsed = performance.now() - start;
  assert.equal(samples.length, 18_000);
  assert.equal(stats.eventCount, 108_000);
  assert.ok(Math.abs(stats.coverage - 1770 / 1800) < 1e-8);
  assert.ok(elapsed < 3000, `derivation took ${elapsed.toFixed(1)}ms`);
  console.info(`30-minute / 108,000-event / 1,000-edit derivation: ${elapsed.toFixed(1)}ms`);
});
