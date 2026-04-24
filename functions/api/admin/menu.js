/**
 * Admin menu CRUD.
 *
 *   GET    /api/admin/menu                   — list categories + items
 *
 *   POST   /api/admin/menu/category          — { name, display_order?, visible? }
 *   PATCH  /api/admin/menu/category?id=N     — { name?, display_order?, visible? }
 *   DELETE /api/admin/menu/category?id=N     — fails if items still reference it
 *
 *   POST   /api/admin/menu/item              — { category_id, name, description?, display_order?, visible? }
 *   PATCH  /api/admin/menu/item?id=N         — { category_id?, name?, description?, display_order?, visible? }
 *   DELETE /api/admin/menu/item?id=N
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

// ─── GET /api/admin/menu ──────────────────────────────────────────────────
export const getMenu = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;
  const [cats, items] = await Promise.all([
    env.DB.prepare(
      `SELECT id, name, display_order, visible FROM menu_categories
       ORDER BY display_order ASC, id ASC`
    ).all(),
    env.DB.prepare(
      `SELECT id, category_id, name, description, display_order, visible
       FROM menu_items ORDER BY category_id ASC, display_order ASC, id ASC`
    ).all()
  ]);
  return json({
    ok: true,
    categories: cats.results || [],
    items: items.results || []
  });
};

// ─── Categories ───────────────────────────────────────────────────────────
export const createCategory = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;
  let body; try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const name = cleanStr(body.name, 100);
  if (!name) return json({ ok: false, error: 'Name required' }, 400);

  const visible = body.visible === false || body.visible === 0 ? 0 : 1;
  let display_order = Number.isFinite(Number(body.display_order)) ? Number(body.display_order) : null;
  if (display_order === null) {
    const row = await env.DB.prepare(`SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM menu_categories`).first();
    display_order = row?.next ?? 0;
  }
  const res = await env.DB.prepare(
    `INSERT INTO menu_categories (name, display_order, visible) VALUES (?, ?, ?)`
  ).bind(name, display_order, visible).run();
  return json({ ok: true, id: res.meta?.last_row_id });
};

export const patchCategory = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: 'Invalid id' }, 400);

  let body; try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const sets = [], binds = [];
  if (typeof body.name === 'string') { const n = cleanStr(body.name, 100); if (!n) return json({ ok: false, error: 'Name required' }, 400); sets.push('name = ?'); binds.push(n); }
  if (typeof body.display_order !== 'undefined' && Number.isFinite(Number(body.display_order))) { sets.push('display_order = ?'); binds.push(Number(body.display_order)); }
  if (typeof body.visible !== 'undefined') { sets.push('visible = ?'); binds.push(body.visible ? 1 : 0); }
  if (!sets.length) return json({ ok: false, error: 'Nothing to update' }, 400);

  binds.push(id);
  await env.DB.prepare(`UPDATE menu_categories SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
  return json({ ok: true });
};

export const deleteCategory = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: 'Invalid id' }, 400);

  const has = await env.DB.prepare(`SELECT 1 FROM menu_items WHERE category_id = ? LIMIT 1`).bind(id).first();
  if (has) return json({ ok: false, error: 'Empty this category first — it still has items.' }, 400);

  await env.DB.prepare(`DELETE FROM menu_categories WHERE id = ?`).bind(id).run();
  return json({ ok: true });
};

// ─── Items ────────────────────────────────────────────────────────────────
export const createItem = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;
  let body; try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const category_id = Number(body.category_id);
  const name = cleanStr(body.name, 120);
  const description = cleanStr(body.description, 500);
  if (!Number.isInteger(category_id) || category_id <= 0) return json({ ok: false, error: 'Invalid category' }, 400);
  if (!name) return json({ ok: false, error: 'Name required' }, 400);

  const catOk = await env.DB.prepare(`SELECT 1 FROM menu_categories WHERE id = ?`).bind(category_id).first();
  if (!catOk) return json({ ok: false, error: 'Category does not exist' }, 400);

  const visible = body.visible === false || body.visible === 0 ? 0 : 1;
  let display_order = Number.isFinite(Number(body.display_order)) ? Number(body.display_order) : null;
  if (display_order === null) {
    const row = await env.DB.prepare(
      `SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM menu_items WHERE category_id = ?`
    ).bind(category_id).first();
    display_order = row?.next ?? 0;
  }

  const res = await env.DB.prepare(
    `INSERT INTO menu_items (category_id, name, description, display_order, visible)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(category_id, name, description, display_order, visible).run();
  return json({ ok: true, id: res.meta?.last_row_id });
};

export const patchItem = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: 'Invalid id' }, 400);

  let body; try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const sets = [], binds = [];
  if (typeof body.category_id !== 'undefined') {
    const cid = Number(body.category_id);
    if (!Number.isInteger(cid) || cid <= 0) return json({ ok: false, error: 'Invalid category' }, 400);
    const catOk = await env.DB.prepare(`SELECT 1 FROM menu_categories WHERE id = ?`).bind(cid).first();
    if (!catOk) return json({ ok: false, error: 'Category does not exist' }, 400);
    sets.push('category_id = ?'); binds.push(cid);
  }
  if (typeof body.name === 'string') { const n = cleanStr(body.name, 120); if (!n) return json({ ok: false, error: 'Name required' }, 400); sets.push('name = ?'); binds.push(n); }
  if (typeof body.description === 'string') { sets.push('description = ?'); binds.push(cleanStr(body.description, 500)); }
  if (typeof body.display_order !== 'undefined' && Number.isFinite(Number(body.display_order))) { sets.push('display_order = ?'); binds.push(Number(body.display_order)); }
  if (typeof body.visible !== 'undefined') { sets.push('visible = ?'); binds.push(body.visible ? 1 : 0); }
  if (!sets.length) return json({ ok: false, error: 'Nothing to update' }, 400);

  binds.push(id);
  await env.DB.prepare(`UPDATE menu_items SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
  return json({ ok: true });
};

export const deleteItem = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: 'Invalid id' }, 400);
  await env.DB.prepare(`DELETE FROM menu_items WHERE id = ?`).bind(id).run();
  return json({ ok: true });
};
