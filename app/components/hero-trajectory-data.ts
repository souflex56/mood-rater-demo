import type { EmotionTag } from '../../lib/va-config.ts';

export const HERO_DURATION_SECONDS = 13;
export const HERO_WAYPOINT_HOLD_SECONDS = 0.3;
export const HERO_FADE_IN_SECONDS = 0.2;
export const HERO_FADE_START_SECONDS = 10.2;
export const HERO_FADE_END_SECONDS = 12.2;
export const HERO_PLOT = { left: 25, right: 335, top: 15, bottom: 285 } as const;

// Keep this exact requested sequence even when a customized tag list omits an entry.
const REQUESTED_TAGS: EmotionTag[] = [
  { id: 'neutral', label: { en: 'neutral', 'zh-CN': '中性' }, valence: .5, arousal: .5 },
  { id: 'sorrow', label: { en: 'sorrow', 'zh-CN': '哀伤' }, valence: .16, arousal: .44 },
  { id: 'peaceful', label: { en: 'peaceful', 'zh-CN': '平和' }, valence: .85, arousal: .23 },
  { id: 'tender', label: { en: 'tender', 'zh-CN': '温柔' }, valence: .74, arousal: .49 },
  { id: 'cheerful', label: { en: 'cheerful', 'zh-CN': '欢快' }, valence: .89, arousal: .67 },
  { id: 'enthusiastic', label: { en: 'enthusiastic', 'zh-CN': '热烈' }, valence: .9, arousal: .8 },
  { id: 'aggressive', label: { en: 'aggressive', 'zh-CN': '激昂' }, valence: .51, arousal: .6 },
  { id: 'anger', label: { en: 'anger', 'zh-CN': '暴怒' }, valence: .17, arousal: .83 },
];
// Keep the journey at nine seconds as its waypoint count changes; retain the fade and loop timing.
export const HERO_STEP_SECONDS = 9 / (REQUESTED_TAGS.length - 1);
const LABEL_WIDTHS = [124, 124, 140, 112, 140, 166, 154, 112];
const STATIC_LABELS = [[35, 250], [20, 180], [194, 250], [172, 208], [166, 159], [162, 112], [24, 67], [35, 22]];

export type HeroPoint = { x: number; y: number };
export type HeroSegment = { start: HeroPoint; control1: HeroPoint; control2: HeroPoint; end: HeroPoint; length: number };
export type HeroWaypoint = HeroPoint & {
  tag: EmotionTag; fromConfig: boolean; progress: number; arrivalSeconds: number;
  labelX: number; labelY: number; labelWidth: number; staticLabelX: number; staticLabelY: number;
  labelFrames: { time: number; x: number; y: number }[];
};
const bound = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const boundedPoint = (x: number, y: number): HeroPoint => ({ x: bound(x, HERO_PLOT.left, HERO_PLOT.right), y: bound(y, HERO_PLOT.top, HERO_PLOT.bottom) });
const fmt = (value: number) => Number(value.toFixed(6));

/** An upright caption below the travelling point, kept inside the SVG edges. */
export function heroLabelOffset(point: HeroPoint, width: number, height = 27): HeroPoint {
  return {
    x: bound(point.x - width / 2, 12, 348 - width) - point.x,
    y: bound(point.y + 18, 12, 288 - height) - point.y,
  };
}

export function heroPointForVA(valence: number, arousal: number): HeroPoint {
  return {
    x: HERO_PLOT.left + valence * (HERO_PLOT.right - HERO_PLOT.left),
    y: HERO_PLOT.bottom - arousal * (HERO_PLOT.bottom - HERO_PLOT.top),
  };
}

export function heroCubicPoint(segment: Omit<HeroSegment, 'length'>, t: number): HeroPoint {
  const u = 1 - t;
  return {
    x: u ** 3 * segment.start.x + 3 * u ** 2 * t * segment.control1.x + 3 * u * t ** 2 * segment.control2.x + t ** 3 * segment.end.x,
    y: u ** 3 * segment.start.y + 3 * u ** 2 * t * segment.control1.y + 3 * u * t ** 2 * segment.control2.y + t ** 3 * segment.end.y,
  };
}

/** Catmull–Rom-derived cubics pass through each VA point; bounded controls keep the curve inside the plot. */
export function buildHeroTrajectory(tags: readonly EmotionTag[], labels?: { widths: readonly number[]; height: number }): { path: string; waypoints: HeroWaypoint[]; segments: HeroSegment[]; totalLength: number } {
  const selected = REQUESTED_TAGS.map(fallback => {
    const configured = tags.find(tag => tag.id === fallback.id);
    const tag = configured ?? fallback;
    return { tag, fromConfig: Boolean(configured), ...heroPointForVA(tag.valence, tag.arousal) };
  });
  const segments = selected.slice(0, -1).map((start, index): HeroSegment => {
    const end = selected[index + 1], previous = selected[index - 1] ?? start, after = selected[index + 2] ?? end;
    const control1 = boundedPoint(start.x + (end.x - previous.x) / 6, start.y + (end.y - previous.y) / 6);
    const control2 = boundedPoint(end.x - (after.x - start.x) / 6, end.y - (after.y - start.y) / 6);
    const segment = { start: { x: start.x, y: start.y }, control1, control2, end: { x: end.x, y: end.y } };
    let length = 0, previousSample = segment.start;
    for (let sample = 1; sample <= 256; sample++) {
      const point = heroCubicPoint(segment, sample / 256);
      length += Math.hypot(point.x - previousSample.x, point.y - previousSample.y);
      previousSample = point;
    }
    return { ...segment, length };
  });
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  let traversed = 0;
  const waypoints = selected.map((point, index): HeroWaypoint => {
    if (index > 0) traversed += segments[index - 1].length;
    const labelWidth = labels?.widths[index] ?? LABEL_WIDTHS[index];
    const labelHeight = labels?.height ?? 27;
    const { x: labelX, y: labelY } = heroLabelOffset(point, labelWidth, labelHeight);
    const arrivalSeconds = index * HERO_STEP_SECONDS;
    const labelFrames = [{ time: arrivalSeconds, x: labelX, y: labelY }, { time: arrivalSeconds + HERO_WAYPOINT_HOLD_SECONDS, x: labelX, y: labelY }];
    const segment = segments[index];
    if (segment) {
      // Match the marker's arc-distance timing; only the edge-safe local offset changes.
      const samples = Array.from({ length: 65 }, (_, step) => heroCubicPoint(segment, step / 64));
      let distance = 0;
      const distances = samples.map((sample, step) => {
        if (step) distance += Math.hypot(sample.x - samples[step - 1].x, sample.y - samples[step - 1].y);
        return distance;
      });
      samples.slice(1).forEach((sample, step) => labelFrames.push({
        time: arrivalSeconds + HERO_WAYPOINT_HOLD_SECONDS + (HERO_STEP_SECONDS - HERO_WAYPOINT_HOLD_SECONDS) * (distance ? distances[step + 1] / distance : (step + 1) / 64),
        ...heroLabelOffset(sample, labelWidth, labelHeight),
      }));
    }
    // A complete, non-overlapping legend when motion is reduced. Each row is
    // centered independently so longer English words fit alongside shorter ones.
    const pair = index - index % 2;
    const rowWidth = (labels?.widths[pair] ?? 0) + (labels?.widths[pair + 1] ?? 0) + 12;
    const staticLabelX = labels ? (360 - rowWidth) / 2 + (index % 2 ? labels.widths[pair] + 12 : 0) : STATIC_LABELS[index][0];
    const staticLabelY = labels ? (300 - (4 * labelHeight + 3 * 12)) / 2 + Math.floor(index / 2) * (labelHeight + 12) : STATIC_LABELS[index][1];
    return { ...point, progress: totalLength > 0 ? traversed / totalLength : 0, arrivalSeconds: index * HERO_STEP_SECONDS,
      labelX, labelY, labelWidth, labelFrames, staticLabelX, staticLabelY };
  });
  const path = `M${fmt(selected[0].x)} ${fmt(selected[0].y)}${segments.map(segment => `C${fmt(segment.control1.x)} ${fmt(segment.control1.y)} ${fmt(segment.control2.x)} ${fmt(segment.control2.y)} ${fmt(segment.end.x)} ${fmt(segment.end.y)}`).join('')}`;
  return { path, waypoints, segments, totalLength };
}
