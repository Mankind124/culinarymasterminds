/**
 * Global middleware — adds basic security headers + simple rate limiting hints.
 * Cloudflare Pages Functions run this on every /functions/* request.
 */

export const onRequest = async ({ request, next }) => {
  const response = await next();

  // Only mutate API responses
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('Cache-Control', 'no-store');
  }
  return response;
};
