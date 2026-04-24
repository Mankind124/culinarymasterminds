import { clearCookie } from './_auth.js';

export const onRequestPost = () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearCookie() }
  });
