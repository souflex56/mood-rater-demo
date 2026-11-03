export type AuthenticatedUser = { userId: string; email: string; displayName: string };

/** Optional backend only: a trusted authentication proxy supplies these headers. */
export async function authenticatedProxyUser(request: Request, secret?: string): Promise<AuthenticatedUser | null> {
  const provided = request.headers.get('x-mood-rater-auth-key');
  if (!secret || secret.length < 32 || !provided || provided.length > 1024) return null;
  const digest = (value: string) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const [expected, received] = await Promise.all([digest(secret), digest(provided)]);
  const a = new Uint8Array(expected), b = new Uint8Array(received);
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a[index] ^ b[index];
  if (difference !== 0) return null;

  const userId = request.headers.get('x-mood-rater-user-id')?.trim();
  const email = request.headers.get('x-mood-rater-user-email')?.trim();
  const displayName = request.headers.get('x-mood-rater-user-name')?.trim() || email;
  if (!userId || userId.length > 200 || !email || email.length > 320 || !displayName || displayName.length > 500) return null;
  return { userId, email, displayName };
}

export function signInPath(value?: string): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\u0000-\u0020\u007f]/.test(value)) return null;
  return value;
}
