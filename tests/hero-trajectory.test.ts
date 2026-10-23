import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultVAInterface } from '../lib/va-config.ts';
import { buildHeroTrajectory, heroCubicPoint, heroLabelOffset, HERO_PLOT } from '../app/components/hero-trajectory-data.ts';

const ids = ['neutral', 'sorrow', 'peaceful', 'tender', 'cheerful', 'enthusiastic', 'aggressive', 'anger'];
const positions = [[.5, .5], [.16, .44], [.85, .23], [.74, .49], [.89, .67], [.9, .8], [.51, .6], [.17, .83]];

test('travelling captions stay inside the SVG for every path sample and edge coordinates', () => {
  const result = buildHeroTrajectory(defaultVAInterface.tags);
  for (const [index, waypoint] of result.waypoints.entries()) {
    let previousTime = waypoint.arrivalSeconds;
    for (const frame of waypoint.labelFrames) {
      assert.ok(Number.isFinite(frame.x) && Number.isFinite(frame.y));
      assert.ok(frame.time >= previousTime);
      previousTime = frame.time;
    }
    const segment = result.segments[index];
    const points = segment ? Array.from({ length: 101 }, (_, step) => heroCubicPoint(segment, step / 100)) : [waypoint];
    points.push({ x: 25, y: 15 }, { x: 335, y: 285 });
    for (const point of points) {
      const offset = heroLabelOffset(point, waypoint.labelWidth);
      assert.ok(point.x + offset.x >= 12 - 1e-9);
      assert.ok(point.x + offset.x + waypoint.labelWidth <= 348 + 1e-9);
      assert.ok(point.y + offset.y >= 12 - 1e-9);
      assert.ok(point.y + offset.y + 27 + 4 <= 292 + 1e-9);
    }
  }
});

test('hero visits all eight requested VA positions in order, including each cubic endpoint', () => {
  const result = buildHeroTrajectory(defaultVAInterface.tags);
  assert.deepEqual(result.waypoints.map(point => point.tag.id), ids);
  result.waypoints.forEach((point, index) => {
    const expected = { x: 25 + positions[index][0] * 310, y: 285 - positions[index][1] * 270 };
    assert.deepEqual({ x: point.x, y: point.y }, expected);
    assert.equal(point.fromConfig, true);
    if (index > 0) assert.deepEqual(heroCubicPoint(result.segments[index - 1], 1), expected);
    if (index < positions.length - 1) assert.deepEqual(heroCubicPoint(result.segments[index], 0), expected);
  });
  assert.equal(result.waypoints[0].progress, 0);
  assert.equal(result.waypoints.at(-1)!.progress, 1);
  assert.equal(result.waypoints.at(-1)!.arrivalSeconds, 9);
});

test('custom tag coordinates and labels apply without replacing omitted sequence entries', () => {
  const custom = { id: 'tender', label: { en: 'custom tender', 'zh-CN': '自定义温柔' }, valence: .2, arousal: .7 };
  const result = buildHeroTrajectory([custom]);
  assert.deepEqual(result.waypoints.map(point => point.tag.id), ids);
  const tender = result.waypoints.find(point => point.tag.id === 'tender')!;
  assert.deepEqual(tender.tag, custom);
  assert.deepEqual([tender.x, tender.y], [87, 96]);
  assert.equal(result.waypoints[0].fromConfig, false);
  assert.deepEqual(result.waypoints[0].tag, defaultVAInterface.tags.find(tag => tag.id === 'neutral'));
  assert.deepEqual(result.waypoints[1].tag, defaultVAInterface.tags.find(tag => tag.id === 'sorrow'));
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


test('complete locale-sized captions fit mobile and desktop animation bounds and static rows', () => {
  // Full 12px labels measured in the browser, including chip padding. The
  // narrowest illustration corresponds to the supported 320px page viewport.
  const localeWidths = [Array(8).fill(56), [69, 69, 78, 67, 75, 97, 90, 62]];
  for (const viewportWidth of [214, 284, 416]) for (const widths of localeWidths) {
    const scale = 360 / viewportWidth;
    const height = 27 * scale;
    const result = buildHeroTrajectory(defaultVAInterface.tags, { widths: widths.map(width => width * scale), height });
    for (const [index, waypoint] of result.waypoints.entries()) {
      assert.ok(waypoint.staticLabelX >= 12);
      assert.ok(waypoint.staticLabelX + waypoint.labelWidth <= 348);
      assert.ok(waypoint.staticLabelY >= 12);
      assert.ok(waypoint.staticLabelY + height <= 288);
      if (index % 2) {
        const previous = result.waypoints[index - 1];
        assert.ok(previous.staticLabelX + previous.labelWidth < waypoint.staticLabelX);
      }
      if (index > 1) assert.ok(result.waypoints[index - 2].staticLabelY + height < waypoint.staticLabelY);
      const segment = result.segments[index];
      const points = segment ? Array.from({ length: 101 }, (_, step) => heroCubicPoint(segment, step / 100)) : [waypoint];
      for (const point of points) {
        const offset = heroLabelOffset(point, waypoint.labelWidth, height);
        assert.ok(point.x + offset.x >= 12 - 1e-9);
        assert.ok(point.x + offset.x + waypoint.labelWidth <= 348 + 1e-9);
        assert.ok(point.y + offset.y >= 12 - 1e-9);
        assert.ok(point.y + offset.y + height + 4 <= 292 + 1e-9);
      }
    }
  }
});
