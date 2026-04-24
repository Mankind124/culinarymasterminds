/**
 * GET    /api/admin/testimonials          — list all (incl. hidden)
 * POST   /api/admin/testimonials          — create { quote, author, visible?, display_order? }
 * PATCH  /api/admin/testimonials?id=N     — update any of { quote, author, visible, display_order }
 * DELETE /api/admin/testimonials?id=N     — delete
 */

import { isAdmin } from './_auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });

const cleanStr = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function ensureAuth(request, env) {
  const ok = await isAdmin(request, env);
  if (!ok) return json({ ok: false, error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ ok: false, error: 'No database configured' }, 500);
  return null;
}

export const onRequestGet = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;
  const { results } = await env.DB.prepare(
    `SELECT id, quote, author, display_order, visible, created_at
     FROM testimonials ORDER BY display_order ASC, id ASC`
  ).all();
  return json({ ok: true, items: results || [] });
};

export const onRequestPost = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const quote = cleanStr(body.quote, 1000);
  const author = cleanStr(body.author, 200);
  const visible = body.visible === false || body.visible === 0 ? 0 : 1;
  const display_order = Number.isFinite(Number(body.display_order)) ? Number(body.display_order) : 0;

  if (!quote || !author) return json({ ok: false, error: 'Quote and author required.' }, 400);

  const res = await env.DB.prepare(
    `INSERT INTO testimonials (quote, author, display_order, visible, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(quote, author, display_order, visible, new Date().toISOString()).run();

  return json({ ok: true, id: res.meta?.last_row_id });
};

export const onRequestPatch = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;
  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: 'Invalid id' }, 400);

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const sets = [];
  const binds = [];
  if (typeof body.quote === 'string') { sets.push('quote = ?'); binds.push(cleanStr(body.quote, 1000)); }
  if (typeof body.author === 'string') { sets.push('author = ?'); binds.push(cleanStr(body.author, 200)); }
  if (typeof body.visible !== 'undefined') { sets.push('visible = ?'); binds.push(body.visible ? 1 : 0); }
  if (typeof body.display_order !== 'undefined' && Number.isFinite(Number(body.display_order))) {
    sets.push('display_order = ?'); binds.push(Number(body.display_order));
  }
  if (!sets.length) return json({ ok: false, error: 'Nothing to update' }, 400);

  binds.push(id);
  await env.DB.prepare(`UPDATE testimonials SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
  return json({ ok: true });
};

export const onRequestDelete = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;
  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: 'Invalid id' }, 400);
  await env.DB.prepare(`DELETE FROM testimonials WHERE id = ?`).bind(id).run();
  return json({ ok: true });
};
