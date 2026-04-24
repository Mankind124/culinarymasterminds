/**
 * GET    /api/admin/gallery               — list all images (admin sees hidden too)
 * POST   /api/admin/gallery               — multipart upload, field "file"
 *                                           returns { ok, item }
 * PATCH  /api/admin/gallery?id=ID         — { caption?, display_order?, visible? }
 * DELETE /api/admin/gallery?id=ID         — remove from R2 + D1
 *
 * Bindings: DB (D1), GALLERY (R2)
 */

import { isAdmin } from './_auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/avif': 'avif'
};
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function makeId(len = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

async function ensureAuth(request, env) {
  const ok = await isAdmin(request, env);
  if (!ok) return json({ ok: false, error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ ok: false, error: 'No database configured' }, 500);
  if (!env.GALLERY) return json({ ok: false, error: 'No image storage configured (R2)' }, 500);
  return null;
}

function shapeItem(row) {
  return {
    id: row.id,
    url: `/img/${row.id}.${row.ext}`,
    caption: row.caption || '',
    display_order: row.display_order,
    visible: !!row.visible,
    size: row.size,
    mime: row.mime,
    created_at: row.created_at
  };
}

export const onRequestGet = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;
  const { results } = await env.DB.prepare(
    `SELECT id, ext, mime, size, caption, display_order, visible, created_at
     FROM gallery_images
     ORDER BY display_order ASC, created_at DESC`
  ).all();
  return json({ ok: true, items: (results || []).map(shapeItem) });
};

export const onRequestPost = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;

  const ct = request.headers.get('content-type') || '';
  if (!ct.startsWith('multipart/form-data')) {
    return json({ ok: false, error: 'Use multipart/form-data with field "file".' }, 400);
  }

  let form;
  try { form = await request.formData(); }
  catch { return json({ ok: false, error: 'Could not read upload.' }, 400); }

  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return json({ ok: false, error: 'Missing file.' }, 400);
  }
  if (file.size === 0) return json({ ok: false, error: 'Empty file.' }, 400);
  if (file.size > MAX_BYTES) {
    return json({ ok: false, error: `File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB).` }, 400);
  }
  const mime = (file.type || '').toLowerCase();
  const ext = ALLOWED_MIME[mime];
  if (!ext) {
    return json({ ok: false, error: 'Only JPEG, PNG, WebP, or AVIF images are allowed.' }, 400);
  }

  const caption = (typeof form.get('caption') === 'string' ? form.get('caption') : '').slice(0, 500);

  // Pick the next display_order = max + 1 (so newest goes to the end)
  const orderRow = await env.DB.prepare(
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM gallery_images`
  ).first();
  const nextOrder = orderRow?.next ?? 0;

  // Generate unique id; collide-retry up to 3 times (probabilistically near zero)
  let id = makeId();
  for (let i = 0; i < 3; i++) {
    const exists = await env.DB.prepare(`SELECT 1 FROM gallery_images WHERE id = ?`).bind(id).first();
    if (!exists) break;
    id = makeId();
  }

  const key = `${id}.${ext}`;
  await env.GALLERY.put(key, file.stream(), {
    httpMetadata: { contentType: mime, cacheControl: 'public, max-age=31536000, immutable' }
  });

  const created_at = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO gallery_images (id, ext, mime, size, caption, display_order, visible, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
  ).bind(id, ext, mime, file.size, caption, nextOrder, created_at).run();

  return json({
    ok: true,
    item: shapeItem({ id, ext, mime, size: file.size, caption, display_order: nextOrder, visible: 1, created_at })
  });
};

export const onRequestPatch = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;

  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  if (!id) return json({ ok: false, error: 'Missing id' }, 400);

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const sets = [];
  const binds = [];
  if (typeof body.caption === 'string') {
    sets.push('caption = ?'); binds.push(body.caption.slice(0, 500));
  }
  if (typeof body.display_order !== 'undefined' && Number.isFinite(Number(body.display_order))) {
    sets.push('display_order = ?'); binds.push(Number(body.display_order));
  }
  if (typeof body.visible !== 'undefined') {
    sets.push('visible = ?'); binds.push(body.visible ? 1 : 0);
  }
  if (!sets.length) return json({ ok: false, error: 'Nothing to update' }, 400);

  binds.push(id);
  await env.DB.prepare(`UPDATE gallery_images SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
  return json({ ok: true });
};

export const onRequestDelete = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;

  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  if (!id) return json({ ok: false, error: 'Missing id' }, 400);

  const row = await env.DB.prepare(`SELECT id, ext FROM gallery_images WHERE id = ?`).bind(id).first();
  if (!row) return json({ ok: true }); // already gone — idempotent

  try { await env.GALLERY.delete(`${row.id}.${row.ext}`); } catch { /* swallow R2 errors */ }
  await env.DB.prepare(`DELETE FROM gallery_images WHERE id = ?`).bind(id).run();
  return json({ ok: true });
};
