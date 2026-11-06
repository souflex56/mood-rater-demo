import test from 'node:test';
import assert from 'node:assert/strict';
import { sitePath } from '../lib/paths.ts';

test('deployment paths preserve navigation, query strings and stored audio identities', () => {
  const base = '/mood-rater-demo';
  assert.equal(sitePath('/', base), base + '/');
  assert.equal(sitePath('/annotate?demo=1#main', base), base + '/annotate?demo=1#main');
  assert.equal(sitePath('/audio/example.mp3', base), base + '/audio/example.mp3');
  assert.equal(sitePath(base + '/audio/example.mp3', base), base + '/audio/example.mp3');
  assert.equal(sitePath('/mood-rater-demo-other/', base), base + '/mood-rater-demo-other/');
  for (const value of ['', '#main', 'blob:https://example.test/id', 'https://example.test/audio.mp3', '//example.test/audio.mp3']) {
    assert.equal(sitePath(value, base), value);
  }
  assert.equal(sitePath('/annotate', ''), '/annotate');
});
