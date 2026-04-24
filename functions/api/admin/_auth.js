/**
 * Shared admin auth helper — verifies the cm_admin session cookie.
 * Returns true if valid; false if missing, malformed, expired, or signature mismatch.
 */

async function hmacSign(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const parts = cookieHeader.split(/;\s*/);
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx === -1) continue;
    const k = p.slice(0, idx);
    if (k === name) return p.slice(idx + 1);
  }
  return null;
}

export async function isAdmin(request, env) {
  if (!env.SESSION_SECRET) return false;
  const token = getCookie(request, 'cm_admin');
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacSign(env.SESSION_SECRET, payload);
  if (sig !== expected) return false;
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  return true;
}

export const clearCookie = () => [
  'cm_admin=',
  'Path=/',
  'HttpOnly',
  'Secure',
  'SameSite=Strict',
  'Max-Age=0'
].join('; ');
