/**
 * GET /api/admin/session — quick "am I logged in?" check used by the dashboard.
 */
import { isAdmin } from './_auth.js';

export const onRequestGet = async ({ request, env }) => {
  const ok = await isAdmin(request, env);
  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 401,
    headers: { 'Content-Type': 'application/json' }
  });
};
