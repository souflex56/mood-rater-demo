import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultVAInterface } from '../lib/va-config.ts';
import { buildHeroTrajectory, heroCubicPoint, HERO_PLOT } from '../app/components/hero-trajectory-data.ts';

const ids = ['neutral', 'peaceful', 'tender', 'cheerful', 'enthusiastic', 'aggressive', 'anger'];
const positions = [[.5, .5], [.85, .23], [.74, .49], [.89, .67], [.9, .8], [.51, .6], [.17, .83]];

test('hero visits all seven requested VA positions in order, including each cubic endpoint', () => {
  const result = buildHeroTrajectory(defaultVAInterface.tags);
  assert.deepEqual(result.waypoints.map(point => point.tag.id), ids);
  result.waypoints.forEach((point, index) => {
    const expected = { x: 25 + positions[index][0] * 310, y: 285 - positions[index][1] * 270 };
    assert.deepEqual({ x: point.x, y: point.y }, expected);
    assert.equal(point.fromConfig, true);
    if (index > 0) assert.deepEqual(heroCubicPoint(result.segments[index - 1], 1), expected);
    if (index < 6) assert.deepEqual(heroCubicPoint(result.segments[index], 0), expected);
  });
  assert.equal(result.waypoints[0].progress, 0);
  assert.equal(result.waypoints[6].progress, 1);
});

test('custom tag coordinates and labels apply without replacing omitted sequence entries', () => {
  const custom = { id: 'tender', label: { en: 'custom tender', 'zh-CN': '自定义温柔' }, valence: .2, arousal: .7 };
  const result = buildHeroTrajectory([custom]);
  assert.deepEqual(result.waypoints.map(point => point.tag.id), ids);
  assert.deepEqual(result.waypoints[2].tag, custom);
  assert.deepEqual([result.waypoints[2].x, result.waypoints[2].y], [87, 96]);
  assert.equal(result.waypoints[0].fromConfig, false);
  assert.deepEqual(result.waypoints[0].tag, defaultVAInterface.tags.find(tag => tag.id === 'neutral'));
});

test('curves stay inside the plot and progress remains finite for edge and coincident custom points', () => {
  for (const collapsed of [false, true]) {
    const tags = ids.map((id, index) => ({ id, label: { en: id, 'zh-CN': id },
      valence: collapsed ? .5 : index % 2, arousal: collapsed ? .5 : Number(index % 3 === 0) }));
    const result = buildHeroTrajectory(tags);
    let previous = 0;
    for (const point of result.waypoints) {
      assert.ok(Number.isFinite(point.progress) && point.progress >= previous && point.progress <= 1);
      previous = point.progress;
    }
    for (const segment of result.segments) {
      assert.ok(Number.isFinite(segment.length) && segment.length >= 0);
      for (let step = 0; step <= 100; step++) {
        const point = heroCubicPoint(segment, step / 100);
        assert.ok(point.x >= HERO_PLOT.left - 1e-9 && point.x <= HERO_PLOT.right + 1e-9);
        assert.ok(point.y >= HERO_PLOT.top - 1e-9 && point.y <= HERO_PLOT.bottom + 1e-9);
      }
    }
  }
});
