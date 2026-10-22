import manifest from '../config/audio-library.json' with { type: 'json' };
import type { AnnotationSessionV2, AudioAsset } from './types.ts';

export type AudioLibraryClip = {
  id: string;
  title: { en: string; 'zh-CN': string };
  url: string;
  mimeType: string;
  demoOnly: boolean;
  /** Optional catalogue hints. Playback always checks the actual file. */
  duration?: number;
  size?: number;
};
export type AudioLibrary = { version: 1; clips: AudioLibraryClip[] };
export const MAX_LOCAL_AUDIO_FILES = 20;
export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;

function record(value: unknown, required: string[], optional: string[], name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object.`);
  const data = value as Record<string, unknown>;
  if (required.some(key => !Object.hasOwn(data, key)) || Object.keys(data).some(key => !required.includes(key) && !optional.includes(key))) throw new TypeError(`${name} contains missing or unknown fields.`);
  return data;
}

/** Strict manifest validation; URLs are repository-hosted files, not external requests. */
export function parseAudioLibrary(value: unknown): AudioLibrary {
  const data = record(value, ['version', 'clips'], [], 'Audio library');
  if (data.version !== 1 || !Array.isArray(data.clips) || data.clips.length > 50) throw new TypeError('Audio library version must be 1, with at most 50 clips.');
  const ids = new Set<string>();
  const clips = data.clips.map((value, index): AudioLibraryClip => {
    const clip = record(value, ['id', 'title', 'url', 'mimeType', 'demoOnly'], ['duration', 'size'], `Clip ${index + 1}`);
    if (typeof clip.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(clip.id) || ids.has(clip.id)) throw new TypeError('Clip IDs must be unique identifiers of at most 80 characters.');
    ids.add(clip.id);
    const title = record(clip.title, ['en', 'zh-CN'], [], 'Clip title');
    for (const language of ['en', 'zh-CN']) if (typeof title[language] !== 'string' || !(title[language] as string).trim() || (title[language] as string).length > 160 || /[\u0000-\u001f\u007f]/.test(title[language] as string)) throw new TypeError('Clip titles must contain bilingual text of at most 160 characters.');
    if (typeof clip.url !== 'string' || clip.url.length > 500 || !/^\/(?!\/)[A-Za-z0-9/_.,~%-]+$/.test(clip.url)) throw new TypeError('Clip URLs must be root-relative repository file paths.');
    let decoded: string;
    try { decoded = decodeURIComponent(clip.url); } catch { throw new TypeError('Clip URL has invalid encoding.'); }
    if (decoded.includes('\\') || decoded.includes('//') || decoded.split('/').some(part => part === '.' || part === '..') || /[\u0000-\u001f\u007f]/.test(decoded)) throw new TypeError('Clip URL must not contain traversal, control characters, or backslashes.');
    if (typeof clip.mimeType !== 'string' || !/^audio\/[a-zA-Z0-9.+-]{1,60}$/.test(clip.mimeType)) throw new TypeError('Clip MIME type must be an audio type.');
    if (typeof clip.demoOnly !== 'boolean') throw new TypeError('Clip demoOnly must be boolean.');
    if (clip.duration !== undefined && (typeof clip.duration !== 'number' || !Number.isFinite(clip.duration) || clip.duration <= 0 || clip.duration > 1800)) throw new TypeError('Duration hint must be greater than zero and at most 1800 seconds.');
    if (clip.size !== undefined && (typeof clip.size !== 'number' || !Number.isInteger(clip.size) || clip.size <= 0 || clip.size > MAX_AUDIO_BYTES)) throw new TypeError('Size hint must be a positive integer no larger than 100 MB.');
    return { id: clip.id, title: { en: title.en as string, 'zh-CN': title['zh-CN'] as string }, url: clip.url, mimeType: clip.mimeType, demoOnly: clip.demoOnly, ...(clip.duration === undefined ? {} : { duration: clip.duration as number }), ...(clip.size === undefined ? {} : { size: clip.size as number }) };
  });
  return { version: 1, clips };
}

/** A URL/name alone never reconnects a recording to audio whose bytes have changed. */
export function findAudioDraft(sessions: AnnotationSessionV2[], asset: AudioAsset): AnnotationSessionV2 | undefined {
  if (!asset.sha256) return undefined;
  return sessions.filter(session => session.mode === 'free' && session.asset.sha256 === asset.sha256 && (
    asset.url ? session.asset.id === asset.id : !session.asset.url
  )).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.revision - a.revision)[0];
}

export const defaultAudioLibrary = parseAudioLibrary(manifest);
