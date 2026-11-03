/** Use the explicit public filename to avoid directory/trailing-slash redirects. */
export function GET(request: Request) {
  return Response.redirect(new URL('/legacy/index.html', request.url), 307);
}
