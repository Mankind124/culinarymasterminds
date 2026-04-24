/**
 * GET    /api/admin/bookings           — list all bookings (admin)
 * PATCH  /api/admin/bookings?id=N      — update booking status: { status: 'new'|'contacted'|'confirmed'|'archived' }
 * DELETE /api/admin/bookings?id=N      — delete a booking
 */

import { isAdmin } from './_auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

const VALID_STATUSES = new Set(['new', 'contacted', 'confirmed', 'archived']);

async function ensureAuth(request, env) {
  const ok = await isAdmin(request, env);
  if (!ok) return json({ ok: false, error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ ok: false, error: 'No database configured' }, 500);
  return null;
}

export const onRequestGet = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;
  const { results } = await env.DB.prepare(
    `SELECT id, name, email, phone, event_type, event_date, guests, location, message, status, created_at
     FROM bookings ORDER BY datetime(created_at) DESC LIMIT 500`
  ).all();
  return json({ ok: true, bookings: results || [] });
};

export const onRequestPatch = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;
  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: 'Invalid id' }, 400);

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const status = String(body.status || '').toLowerCase();
  if (!VALID_STATUSES.has(status)) return json({ ok: false, error: 'Invalid status' }, 400);

  await env.DB.prepare(`UPDATE bookings SET status = ? WHERE id = ?`).bind(status, id).run();
  return json({ ok: true });
};

export const onRequestDelete = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;
  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: 'Invalid id' }, 400);

  await env.DB.prepare(`DELETE FROM bookings WHERE id = ?`).bind(id).run();
  return json({ ok: true });
};
