import { z } from 'zod';
import type { AnnotationSessionV2 } from '../types';
import { isUtcTimestamp } from '../annotation.ts';
import { parseVAInterfaceProfile } from '../va-config.ts';
export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
export const MAX_SESSION_BYTES = 32 * 1024 * 1024;
export const AUDIO_CHUNK_BYTES = 5 * 1024 * 1024;
export const SESSION_CHUNK_BYTES = 1024 * 1024;
const identifier = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/);
const coordinate = z.number().finite().min(0).max(1);
export const studyInput = z.object({
  title: z.string().trim().min(1).max(200), titleZh: z.string().trim().max(200).default(''),
  description: z.string().max(10000).default(''), descriptionZh: z.string().max(10000).default(''),
  consent: z.string().min(1).max(10000), consentZh: z.string().max(10000).default(''), emotionTarget: z.enum(['perceived', 'felt']).default('perceived'),
}).strict();
export const audioInput = z.object({ name: z.string().trim().min(1).max(255), size: z.number().int().positive().max(MAX_AUDIO_BYTES),
  mimeType: z.string().regex(/^audio\/[a-zA-Z0-9.+-]+$/).max(100), duration: z.number().positive().max(1800),
}).strict();
export const submissionInput = z.object({ participationToken: z.string().min(32).max(200), submissionId: identifier, sessionId: identifier,
  assetId: identifier, revision: z.number().int().min(0).max(1000000), size: z.number().int().positive().max(MAX_SESSION_BYTES), sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
const ratingEvent = z.object({ id: identifier, sequence: z.number().int().min(0), mediaTime: z.number().finite().min(0).max(1800),
  monotonicTime: z.number().finite().min(0), valence: coordinate, arousal: coordinate, input: z.enum(['pointer', 'keyboard', 'slider', 'legacy']),
  utcTimestamp: z.string().max(30).refine(isUtcTimestamp, 'Expected a valid UTC ISO timestamp').optional(),
}).strict();
const interfaceProfile = z.unknown().superRefine((value, ctx) => {
  try { parseVAInterfaceProfile(value); }
  catch (error) { ctx.addIssue({code:'custom',message:error instanceof Error ? error.message : 'Invalid VA interface profile'}); }
});
const sessionMetadata = z.object({ schemaVersion: z.literal(2), id: identifier, createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
  mode: z.literal('research'), locale: z.enum(['en', 'zh-CN']), emotionTarget: z.enum(['perceived', 'felt']),
  asset: z.object({ id: identifier, name: z.string(), size: z.number().int(), mimeType: z.string(), duration: z.number().positive().max(1800), sha256: z.string().optional(), url: z.string().optional(), studyId: identifier.optional(), status: z.enum(['pending', 'ready']).optional() }).strict(),
  studyId: identifier, studyVersion: z.number().int().positive(), participantId: identifier, researchCode: z.string().max(100).optional(), notes: z.string().max(10000), revision: z.number().int().min(0),
  protocol: z.object({ scale: z.tuple([z.literal(0), z.literal(1)]), sampleRateHz: z.literal(10), resampling: z.literal('zero_order_hold'), version: z.literal(1) }).strict(),
  passes: z.unknown(), legacy: z.boolean().optional(),
  importedFromSessionId: z.string().min(1).max(200).refine(value => value.trim().length > 0).optional(),
  interfaceProfile: interfaceProfile.optional(),
}).strict();
const passMetadata = z.object({ id: identifier, order: z.number().int().min(0), start: z.number().finite().min(0).max(1800), end: z.number().finite().min(0).max(1800),
  events: z.unknown(), revoked: z.boolean(), endReason: z.enum(['stop','pause','seek','ended','hidden','buffering','interrupted','error']).optional(),
}).strict();
// Validate each event without cloning the entire 30-minute object graph. Zod's
// ordinary array parser would retain a second complete copy during validation.
export const sessionInput = z.custom<AnnotationSessionV2>().superRefine((input, ctx) => {
  const header = sessionMetadata.safeParse(input);
  if (!header.success) { for (const issue of header.error.issues.slice(0,5)) ctx.addIssue(issue); return; }
  const session = header.data;
  if (!Array.isArray(session.passes) || session.passes.length > 10000) { ctx.addIssue({code:'custom',message:'Invalid recording pass list'}); return; }
  const ids = new Set<string>(); const orders = new Set<number>(); const events = new Set<string>(); let total = 0;
  for (const rawPass of session.passes) {
    const result = passMetadata.safeParse(rawPass);
    if (!result.success) { for (const issue of result.error.issues.slice(0,5)) ctx.addIssue(issue); return; }
    const pass = result.data;
    if (ids.has(pass.id) || orders.has(pass.order) || pass.end < pass.start || pass.end > session.asset.duration + 0.00001) { ctx.addIssue({code:'custom',message:'Invalid recording pass interval or duplicate identity'}); return; }
    if (!Array.isArray(pass.events) || total + pass.events.length > 150000) { ctx.addIssue({code:'custom',message:'Session exceeds 150000 raw events or has an invalid event list'}); return; }
    ids.add(pass.id); orders.add(pass.order); let previous = -1; let sequence = -1; let monotonic = -1;
    for (const rawEvent of pass.events) {
      const result = ratingEvent.safeParse(rawEvent);
      if (!result.success) { for (const issue of result.error.issues.slice(0,5)) ctx.addIssue(issue); return; }
      const event = result.data;
      if (events.has(event.id) || event.mediaTime < pass.start || event.mediaTime > session.asset.duration || event.mediaTime < previous || event.sequence <= sequence || event.monotonicTime < monotonic) { ctx.addIssue({code:'custom',message:'Invalid event order or interval'}); return; }
      events.add(event.id); previous = event.mediaTime; sequence = event.sequence; monotonic = event.monotonicTime; total++;
    }
  }
});
export function expectedChunkLength(size: number, chunkSize: number, index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= Math.ceil(size / chunkSize)) return null;
  return Math.min(chunkSize, size - index * chunkSize);
}
export function csvCell(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let text = value == null ? '' : String(value);
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
