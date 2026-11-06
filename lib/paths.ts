/** Keep stored audio identities independent of the host's deployment directory. */
export function sitePath(value: string, basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''): string {
  if (!basePath || !value.startsWith('/') || value.startsWith('//')) return value;
  if (value === basePath || value.startsWith(basePath + '/') || value.startsWith(basePath + '?') || value.startsWith(basePath + '#')) return value;
  return basePath + value;
}
