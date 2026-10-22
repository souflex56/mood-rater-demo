import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { settings } from '@/db/schema';
import { getChatGPTUser } from '@/app/chatgpt-auth';

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export function bucket() { if (!env.BUCKET) throw new ApiError(503, 'Storage is not configured'); return env.BUCKET; }
export function id() { return crypto.randomUUID(); }
export function token() { return [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2, '0')).join(''); }
export async function sha256(input: BufferSource | string) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') throw new ApiError(403, 'Cross-origin mutation is not allowed');
}
export async function bodyBytes(request: Request, maximum: number) {
  const declared = Number(request.headers.get('content-length'));
  if (declared > maximum) throw new ApiError(413, 'Request is too large');
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    length += value.byteLength;
    if (length > maximum) { await reader.cancel(); throw new ApiError(413, 'Request is too large'); }
    chunks.push(value);
  }
  const result = new Uint8Array(length); let offset = 0;
  for (const part of chunks) { result.set(part, offset); offset += part.length; }
  return result;
}
export async function jsonBody(request: Request) {
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await bodyBytes(request, 65536))); }
  catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(400, 'Invalid JSON request'); }
}
export async function identity(request: Request) {
  let user = await getChatGPTUser();
  if (user?.userId === 'local_seedy' && (!import.meta.env.DEV || !['127.0.0.1','localhost','[::1]'].includes(new URL(request.url).hostname))) user = null;
  const configuredOwner = env.ADMIN_USER_ID;
  const pinnedOwner = (await getDb().select().from(settings).where(eq(settings.key, 'admin_user_id')).get())?.value;
  const ownerId = configuredOwner || pinnedOwner;
  return { user, isAdmin: Boolean(user && ownerId && user.userId === ownerId),
    canBootstrap: Boolean(user && !ownerId && env.ADMIN_BOOTSTRAP_EMAIL && user.email.trim().toLowerCase() === env.ADMIN_BOOTSTRAP_EMAIL.trim().toLowerCase()) };
}
export async function requireAdmin(request: Request) {
  const auth = await identity(request);
  if (!auth.user) throw new ApiError(401, 'Sign in with ChatGPT first');
  if (!auth.isAdmin) throw new ApiError(403, 'Only the research owner can access this resource');
  return auth.user;
}
export async function bootstrap(request: Request) {
  const auth = await identity(request);
  if (auth.isAdmin) return auth;
  if (!auth.canBootstrap || !auth.user) throw new ApiError(403, 'This account is not authorized to initialize the research owner');
  await getDb().insert(settings).values({key:'admin_user_id',value:auth.user.userId}).onConflictDoNothing();
  const result = await identity(request);
  if (!result.isAdmin) throw new ApiError(409, 'The research owner has already been assigned');
  return result;
}
