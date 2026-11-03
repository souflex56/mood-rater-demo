/** The browser-only workflow never initializes a database or an identity provider. */
export function disabledResearchResponse(request: Request): Response {
  const identity = new URL(request.url).pathname === '/api/identity' && request.method === 'GET';
  return Response.json(identity
    ? { user: null, isAdmin: false, canBootstrap: false, researchEnabled: false }
    : { error: 'Research services are disabled.' }, {
    status: identity ? 200 : 404,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' },
  });
}
