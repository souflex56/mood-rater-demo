/** Replaced by the optional Cloudflare adapter only in that explicit build target. */
export async function handleResearchRequest(_request: Request): Promise<Response> {
  return Response.json({ error: 'The research backend is not configured for this deployment.' }, { status: 503 });
}
