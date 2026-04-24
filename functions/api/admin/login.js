/**
 * POST /api/admin/login — admin authentication
 * Compares submitted password with env.ADMIN_PASSWORD using a constant-time check.
 * On success, sets an httpOnly signed-cookie session.
 *
 * Required env bindings:
 *   ADMIN_PASSWORD   -> the admin password (set via Cloudflare dashboard secrets)
 *   SESSION_SECRET   -> long random string used to sign the session cookie
 */

const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders }
  });

// Constant-time string compare
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSign(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const onRequestPost = async ({ request, env }) => {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return json({ ok: false, error: 'Admin not configured. Set ADMIN_PASSWORD and SESSION_SECRET secrets in Cloudflare.' }, 500);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const password = typeof body.password === 'string' ? body.password : '';
  if (!timingSafeEqual(password, env.ADMIN_PASSWORD)) {
    // small artificial delay to slow brute force
    await new Promise(r => setTimeout(r, 400));
    return json({ ok: false, error: 'Incorrect password.' }, 401);
  }

  // Issue a session token: payload = `${expiresAt}` ; cookie = `${payload}.${hmac}`
  const expiresAt = Date.now() + 1000 * 60 * 60 * 8; // 8 hours
  const payload = String(expiresAt);
  const sig = await hmacSign(env.SESSION_SECRET, payload);
  const token = `${payload}.${sig}`;

  const cookie = [
    `cm_admin=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=${60 * 60 * 8}`
  ].join('; ');

  return json({ ok: true }, 200, { 'Set-Cookie': cookie });
};
