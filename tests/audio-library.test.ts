import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { defaultAudioLibrary, findAudioDraft, MAX_AUDIO_BYTES, parseAudioLibrary } from '../lib/audio-library.ts';
import { addRating, closePass, createSession, startPass } from '../lib/annotation.ts';
import type { AudioAsset } from '../lib/types.ts';

const library = () => structuredClone(defaultAudioLibrary);
const asset = (id: string, sha256 = 'a'.repeat(64), url?: string): AudioAsset => ({ id, name: id, duration: 12, size: 1024, mimeType: 'audio/wav', sha256, ...(url ? { url } : {}) });

test('audio library validates, clones bilingual labels, and accepts an empty custom library', () => {
  const input = library();
  const parsed = parseAudioLibrary(input);
  input.clips[0].title.en = 'changed';
  assert.notEqual(parsed.clips[0].title.en, input.clips[0].title.en);
  assert.deepEqual(parseAudioLibrary({ version: 1, clips: [] }), { version: 1, clips: [] });
  assert.equal(parsed.clips.length, 3);
  assert.ok(parsed.clips.every(clip => clip.demoOnly && clip.title.en && clip.title['zh-CN']));
});

test('audio library rejects ambiguous identities, non-audio MIME, missing language, unknown keys and limits', () => {
  const mutate = (fn: (value: ReturnType<typeof library>) => void) => { const value = library(); fn(value); assert.throws(() => parseAudioLibrary(value), TypeError); };
  mutate(value => { value.clips[1].id = value.clips[0].id; });
  mutate(value => { value.clips[0].id = '../file'; });
  mutate(value => { value.clips[0].mimeType = 'text/html'; });
  mutate(value => { value.clips[0].title['zh-CN'] = ''; });
  mutate(value => { value.clips[0].duration = 1800.1; });
  mutate(value => { value.clips[0].size = MAX_AUDIO_BYTES + 1; });
  mutate(value => { value.clips = Array.from({ length: 51 }, (_, i) => ({ ...value.clips[0], id: `clip-${i}` })); });
  assert.throws(() => parseAudioLibrary({ ...library(), secret: true }), TypeError);
  assert.throws(() => parseAudioLibrary({ version: 2, clips: [] }), TypeError);
});

test('audio library accepts local paths and rejects external URLs and encoded traversal', () => {
  for (const url of ['https://example.com/a.wav', '//example.com/a.wav', 'data:audio/wav,abc', 'javascript:alert(1)', '/audio/../a.wav', '/audio/%2e%2e/a.wav', '/%2fexample.com/a.wav', '/audio/%5c/a.wav', '/audio/%00.wav', '/audio/%XX.wav']) {
    const value = library(); value.clips[0].url = url;
    assert.throws(() => parseAudioLibrary(value), TypeError, url);
  }
  const value = library(); value.clips[0].url = '/audio/my%20file.wav';
  assert.equal(parseAudioLibrary(value).clips[0].url, '/audio/my%20file.wav');
});

test('draft selection is byte-bound and preserves separate hosted clip identities', () => {
  const a = asset('library-a', 'a'.repeat(64), '/audio/a.wav');
  const b = asset('library-b', 'a'.repeat(64), '/audio/b.wav');
  const first = createSession(a, 'en', 'perceived');
  const second = createSession(b, 'en', 'perceived');
  assert.equal(findAudioDraft([first, second], a)?.id, first.id);
  assert.equal(findAudioDraft([first, second], b)?.id, second.id);
  assert.equal(findAudioDraft([first, second], { ...a, sha256: 'b'.repeat(64) }), undefined);
  assert.equal(findAudioDraft([first, second], { ...a, sha256: undefined }), undefined);
  assert.equal(findAudioDraft([first, second], asset('local-same-bytes')), undefined);
});

test('local re-selection restores renamed byte-identical files, never research or other bytes', () => {
  const original = createSession(asset('older-random-id'), 'en', 'perceived');
  const newer = { ...original, id: 'imported-copy', updatedAt: '2099-01-01T00:00:00.000Z' };
  const research = { ...newer, id: 'research-session', mode: 'research' as const, updatedAt: '2099-12-01T00:00:00.000Z' };
  assert.equal(findAudioDraft([original, research, newer], asset('local-new-name'))?.id, newer.id);
  assert.equal(findAudioDraft([original], asset('local-other', 'c'.repeat(64))), undefined);
});

test('switching draft lookup retains each audio’s raw events and notes without mutating inputs', () => {
  const a = asset('library-a', 'a'.repeat(64), '/audio/a.wav');
  const b = asset('library-b', 'b'.repeat(64), '/audio/b.wav');
  const recorded = { ...closePass(addRating(startPass(createSession(a, 'en', 'perceived'), 1), 1.2, 20, .2, .7, 'pointer'), 3, 'stop'), notes: 'A only' };
  const blank = { ...createSession(b, 'en', 'perceived'), notes: 'B only' };
  const sessions = [recorded, blank];
  const snapshot = structuredClone(sessions);
  assert.equal(findAudioDraft(sessions, b)?.passes.length, 0);
  assert.equal(findAudioDraft(sessions, a)?.passes[0].events[0].valence, .2);
  assert.equal(findAudioDraft(sessions, a)?.notes, 'A only');
  assert.deepEqual(sessions, snapshot);
});

test('bundled demo WAV files are distinct bounded PCM assets with actual 12/15/18 second duration', () => {
  const hashes = new Set<string>();
  const durations: number[] = [];
  for (const clip of defaultAudioLibrary.clips) {
    const file = readFileSync(new URL(`../public${clip.url}`, import.meta.url));
    assert.equal(file.toString('ascii', 0, 4), 'RIFF');
    assert.equal(file.toString('ascii', 8, 12), 'WAVE');
    assert.equal(file.readUInt16LE(20), 1);
    assert.equal(file.readUInt16LE(22), 1);
    assert.equal(file.readUInt16LE(34), 16);
    assert.equal(file.readUInt32LE(40) + 44, file.length);
    assert.ok(file.length < MAX_AUDIO_BYTES);
    durations.push(file.readUInt32LE(40) / file.readUInt32LE(28));
    hashes.add(createHash('sha256').update(file).digest('hex'));
  }
  assert.deepEqual(durations, [12, 15, 18]);
  assert.equal(hashes.size, defaultAudioLibrary.clips.length);
});
