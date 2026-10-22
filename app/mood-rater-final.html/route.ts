export function GET(request:Request){return Response.redirect(new URL('/annotate',request.url),308);}
