import interfaceData from '../config/va-interface.json' with { type: 'json' };
import tagData from '../config/emotion-tags.json' with { type: 'json' };

export type LocalizedLabel = { en: string; 'zh-CN': string };
export type EmotionTag = {
  id: string;
  label: LocalizedLabel;
  valence: number;
  arousal: number;
};
type RGB = [number, number, number];
type Axis = { name: LocalizedLabel; low: LocalizedLabel; high: LocalizedLabel };
export type VAConfig = {
  id: string;
  version: number;
  guide: { diameterRatio: number; maxTags: number };
  background: { topLeft: RGB; topRight: RGB; bottomLeft: RGB; bottomRight: RGB };
  axes: { x: Axis; y: Axis };
};
export type VAInterfaceProfile = { config: VAConfig; tagListId: string; tags: EmotionTag[] };

function object(value: unknown, keys: string[], path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object.`);
  }
  const data = value as Record<string, unknown>;
  if (Object.keys(data).length !== keys.length || keys.some(key => !Object.hasOwn(data, key))) {
    throw new TypeError(`${path} must contain exactly: ${keys.join(', ')}.`);
  }
  return data;
}

function identifier(value: unknown, path: string): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(value)) {
    throw new TypeError(`${path} must be a 1–120 character identifier (letters, numbers, dot, underscore or hyphen).`);
  }
  return value;
}

function number(value: unknown, min: number, max: number, path: string, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new TypeError(`${path} must be ${integer ? 'an integer' : 'a finite number'} between ${min} and ${max}.`);
  }
  return value;
}

function label(value: unknown, path: string): LocalizedLabel {
  const data = object(value, ['en', 'zh-CN'], path);
  const strings = ['en', 'zh-CN'].map(language => {
    const text = data[language];
    if (typeof text !== 'string' || !text.trim() || text.length > 80 || [...text].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) {
      throw new TypeError(`${path}.${language} must be nonempty text of at most 80 characters, without control characters.`);
    }
    return text;
  });
  return { en: strings[0], 'zh-CN': strings[1] };
}

function axis(value: unknown, path: string): Axis {
  const data = object(value, ['name', 'low', 'high'], path);
  return { name: label(data.name, `${path}.name`), low: label(data.low, `${path}.low`), high: label(data.high, `${path}.high`) };
}

function rgb(value: unknown, path: string): RGB {
  if (!Array.isArray(value) || value.length !== 3) throw new TypeError(`${path} must be an RGB array with three integers.`);
  return Array.from(value, (channel, index) => number(channel, 0, 255, `${path}[${index}]`, true)) as RGB;
}

/** Validate and clone a complete, portable interface profile. No unrecognized fields are discarded. */
export function parseVAInterfaceProfile(value: unknown): VAInterfaceProfile {
  const profile = object(value, ['config', 'tagListId', 'tags'], 'profile');
  const config = object(profile.config, ['id', 'version', 'guide', 'background', 'axes'], 'config');
  const guide = object(config.guide, ['diameterRatio', 'maxTags'], 'config.guide');
  const diameterRatio = number(guide.diameterRatio, 0, 1, 'config.guide.diameterRatio');
  if (diameterRatio === 0) throw new TypeError('config.guide.diameterRatio must be greater than zero.');
  const background = object(config.background, ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'], 'config.background');
  const axes = object(config.axes, ['x', 'y'], 'config.axes');
  if (!Array.isArray(profile.tags) || profile.tags.length > 1000) throw new TypeError('profile.tags must contain at most 1000 tags.');
  const ids = new Set<string>();
  const tags = Array.from(profile.tags, (value, index) => {
    const path = `tags[${index}]`;
    const tag = object(value, ['id', 'label', 'valence', 'arousal'], path);
    const id = identifier(tag.id, `${path}.id`);
    if (ids.has(id)) throw new TypeError(`${path}.id duplicates another tag: ${id}.`);
    ids.add(id);
    return {
      id,
      label: label(tag.label, `${path}.label`),
      valence: number(tag.valence, 0, 1, `${path}.valence`),
      arousal: number(tag.arousal, 0, 1, `${path}.arousal`),
    };
  });
  return {
    config: {
      id: identifier(config.id, 'config.id'),
      version: number(config.version, 1, 1_000_000, 'config.version', true),
      guide: { diameterRatio, maxTags: number(guide.maxTags, 1, 5, 'config.guide.maxTags', true) },
      background: {
        topLeft: rgb(background.topLeft, 'config.background.topLeft'),
        topRight: rgb(background.topRight, 'config.background.topRight'),
        bottomLeft: rgb(background.bottomLeft, 'config.background.bottomLeft'),
        bottomRight: rgb(background.bottomRight, 'config.background.bottomRight'),
      },
      axes: { x: axis(axes.x, 'config.axes.x'), y: axis(axes.y, 'config.axes.y') },
    },
    tagListId: identifier(profile.tagListId, 'profile.tagListId'),
    tags,
  };
}

export const defaultVAInterface = parseVAInterfaceProfile({
  config: interfaceData,
  tagListId: tagData.id,
  tags: tagData.tags,
});

/** The specified diameter is relative to square width; Euclidean radius is half of it. */
export function findNearbyTags(valence: number, arousal: number, profile: VAInterfaceProfile = defaultVAInterface): EmotionTag[] {
  if (!Number.isFinite(valence) || !Number.isFinite(arousal) || valence < 0 || valence > 1 || arousal < 0 || arousal > 1) return [];
  const radius = profile.config.guide.diameterRatio / 2;
  const radiusSquared = radius * radius;
  return profile.tags
    .map((tag, order) => ({ tag, order, distance: (tag.valence - valence) ** 2 + (tag.arousal - arousal) ** 2 }))
    .filter(item => item.distance <= radiusSquared)
    .sort((a, b) => a.distance - b.distance || a.order - b.order)
    .slice(0, profile.config.guide.maxTags)
    .map(item => item.tag);
}

/** Match the original canvas: interpolate vertically, floor, then horizontally, floor. */
export function backgroundColorAt(valence: number, arousal: number, background: VAConfig['background']): RGB {
  const x = number(valence, 0, 1, 'valence');
  const y = 1 - number(arousal, 0, 1, 'arousal');
  return background.topLeft.map((channel, index) => {
    const left = Math.floor(channel + (background.bottomLeft[index] - channel) * y);
    const right = Math.floor(background.topRight[index] + (background.bottomRight[index] - background.topRight[index]) * y);
    return Math.floor(left + (right - left) * x);
  }) as RGB;
}
