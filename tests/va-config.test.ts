import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { backgroundColorAt, defaultVAInterface, findNearbyTags, parseVAInterfaceProfile } from '../lib/va-config.ts';
import type { EmotionTag, VAInterfaceProfile } from '../lib/va-config.ts';

const copy = (): VAInterfaceProfile => structuredClone(defaultVAInterface);
const tag = (id: string, valence: number, arousal: number): EmotionTag => ({ id, label: { en: id, 'zh-CN': id }, valence, arousal });

test('all 97 original tags, translations, order and VA coordinates survive extraction exactly', () => {
  const legacy = readFileSync(new URL('../mood-rater-final.html', import.meta.url), 'utf8');
  const data = /const emotionTags = (\[[\s\S]*?\n        \]);/.exec(legacy)?.[1];
  const translations = /const emotionTranslations = (\{[\s\S]*?\n        \});/.exec(legacy)?.[1];
  assert.ok(data && translations);
  const original = JSON.parse(data.replaceAll("'", '"')) as [string, number, number][];
  const dictionary = JSON.parse(translations.replaceAll("'", '"')) as Record<string, string>;
  assert.equal(original.length, 97);
  assert.equal(Object.keys(dictionary).length, 97);
  assert.deepEqual(defaultVAInterface.tags, original.map(([id, valence, arousal]) => ({ id, label: { en: id, 'zh-CN': dictionary[id] }, valence, arousal })));
});

test('guide uses diameter one eighth of width, includes the circle edge and never falls back outside it', () => {
  const profile = copy();
  assert.equal(profile.config.guide.diameterRatio, 1 / 8);
  assert.equal(profile.config.guide.maxTags, 5);
  profile.tags = [tag('on-edge', 0.5625, 0.5), tag('just-outside', 0.562500001, 0.5), tag('inside', 0.52, 0.52), tag('diameter-as-radius-would-include', 0.6, 0.5)];
  assert.deepEqual(findNearbyTags(0.5, 0.5, profile).map(t => t.id), ['inside', 'on-edge']);
  assert.deepEqual(findNearbyTags(0, 0, profile), []);
  assert.deepEqual(findNearbyTags(0, 1), []);
  for (const [x, y] of [[NaN, 0.5], [0.5, Infinity], [-0.1, 0.5], [0.5, 1.1]]) assert.deepEqual(findNearbyTags(x, y, profile), []);
});

test('guide selects at most five nearest tags, preserving source order for equal distances', () => {
  const profile = copy();
  profile.tags = [tag('far', 0.55, 0.5), tag('first-tie', 0.53125, 0.5), tag('nearest', 0.5, 0.5), tag('second-tie', 0.46875, 0.5), tag('third-tie', 0.5, 0.53125), tag('fourth-tie', 0.5, 0.46875), tag('outside', 0.7, 0.7)];
  assert.deepEqual(findNearbyTags(0.5, 0.5, profile).map(t => t.id), ['nearest', 'first-tie', 'second-tie', 'third-tie', 'fourth-tie']);
  profile.config.guide.maxTags = 2;
  assert.deepEqual(findNearbyTags(0.5, 0.5, profile).map(t => t.id), ['nearest', 'first-tie']);
  profile.config.guide.diameterRatio = 0.01;
  assert.deepEqual(findNearbyTags(0.5, 0.5, profile).map(t => t.id), ['nearest']);
  assert.deepEqual(findNearbyTags(0.29, 0.21).slice(0, 2).map(t => t.id), ['fatigued', 'tired']);
});

test('background exactly matches original corner colors and vertical-first floored interpolation', () => {
  const background = defaultVAInterface.config.background;
  assert.deepEqual(backgroundColorAt(0, 1, background), [180, 0, 0]);
  assert.deepEqual(backgroundColorAt(1, 1, background), [220, 120, 0]);
  assert.deepEqual(backgroundColorAt(0, 0, background), [0, 40, 120]);
  assert.deepEqual(backgroundColorAt(1, 0, background), [120, 180, 60]);
  assert.deepEqual(backgroundColorAt(0.5, 0.5, background), [130, 85, 45]);
  // This independent translation follows the original canvas's two interpolation stages.
  const interpolate = (a: number[], b: number[], amount: number) => a.map((channel, index) => Math.floor(channel + (b[index] - channel) * amount));
  for (let row = 0; row <= 20; row++) {
    for (let column = 0; column <= 20; column++) {
      const v = column / 20, a = row / 20, y = 1 - a;
      const expected = interpolate(interpolate([180, 0, 0], [0, 40, 120], y), interpolate([220, 120, 0], [120, 180, 60], y), v);
      assert.deepEqual(backgroundColorAt(v, a, background), expected);
    }
  }
  assert.throws(() => backgroundColorAt(NaN, 0.5, background));
  assert.throws(() => backgroundColorAt(0.5, 2, background));
});

test('profile parser clones valid editable configurations and rejects malformed or unbounded data', () => {
  const original = copy();
  const parsed = parseVAInterfaceProfile(original);
  assert.deepEqual(parsed, original);
  parsed.tags[0].label.en = 'changed';
  parsed.config.background.topLeft[0] = 3;
  assert.notEqual(parsed.tags[0].label.en, original.tags[0].label.en);
  assert.equal(original.config.background.topLeft[0], 180);

  const invalid = [
    (p: VAInterfaceProfile) => { p.config.guide.diameterRatio = 0; },
    (p: VAInterfaceProfile) => { p.config.guide.diameterRatio = 1.001; },
    (p: VAInterfaceProfile) => { p.config.guide.diameterRatio = NaN; },
    (p: VAInterfaceProfile) => { p.config.guide.maxTags = 6; },
    (p: VAInterfaceProfile) => { p.config.guide.maxTags = 0; },
    (p: VAInterfaceProfile) => { p.config.guide.maxTags = 1.5; },
    (p: VAInterfaceProfile) => { p.config.background.topLeft[0] = -1; },
    (p: VAInterfaceProfile) => { p.config.background.topLeft[0] = 256; },
    (p: VAInterfaceProfile) => { p.config.background.topLeft[0] = 1.5; },
    (p: VAInterfaceProfile) => { p.config.background.topLeft = Array(3) as [number, number, number]; },
    (p: VAInterfaceProfile) => { p.config.axes.x.name.en = ''; },
    (p: VAInterfaceProfile) => { p.config.axes.x.name.en = ' '.repeat(10); },
    (p: VAInterfaceProfile) => { p.config.axes.x.name.en = 'v\n'; },
    (p: VAInterfaceProfile) => { p.config.axes.x.name.en = 'x'.repeat(81); },
    (p: VAInterfaceProfile) => { p.tags[0].valence = Infinity; },
    (p: VAInterfaceProfile) => { p.tags[0].arousal = -0.1; },
    (p: VAInterfaceProfile) => { p.tags[0].arousal = 1.1; },
    (p: VAInterfaceProfile) => { p.tags[1].id = p.tags[0].id; },
    (p: VAInterfaceProfile) => { p.tags[0].id = 'invalid id'; },
    (p: VAInterfaceProfile) => { p.tags = Array(2); },
    (p: VAInterfaceProfile) => { p.tags = Array.from({ length: 1001 }, (_, i) => tag(`tag-${i}`, 0.5, 0.5)); },
    (p: VAInterfaceProfile) => { p.config.version = 0; },
    (p: VAInterfaceProfile) => { p.tagListId = ''; },
    (p: VAInterfaceProfile) => { Object.assign(p, { unexpected: true }); },
    (p: VAInterfaceProfile) => { Object.assign(p.config.axes.x, { unexpected: true }); },
    (p: VAInterfaceProfile) => { Object.assign(p.tags[0], { unexpected: true }); },
  ];
  for (const mutate of invalid) { const p = copy(); mutate(p); assert.throws(() => parseVAInterfaceProfile(p)); }
  for (const value of [null, [], {}, true, 'invalid']) assert.throws(() => parseVAInterfaceProfile(value));
  const empty = copy(); empty.tags = [];
  assert.deepEqual(parseVAInterfaceProfile(empty).tags, []);
});
