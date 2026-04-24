/**
 * GET /img/:id.:ext — public image serving via R2
 *
 * Looks up the R2 object by id, returns the bytes with edge-friendly cache.
 * Bound R2 binding name: GALLERY
 */

export const onRequestGet = async ({ request, env }) => {
  if (!env.GALLERY) return new Response('Image storage not configured', { status: 500 });

  const url = new URL(request.url);
  // /img/abc123.jpg  →  key = "abc123.jpg"
  const filename = url.pathname.replace(/^\/img\//, '');
  if (!filename || filename.includes('/')) {
    return new Response('Bad request', { status: 400 });
  }

  const obj = await env.GALLERY.get(filename);
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  // Strong cache — image content at this URL is immutable (id never reused)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('etag', obj.httpEtag);

  return new Response(obj.body, { headers });
};
