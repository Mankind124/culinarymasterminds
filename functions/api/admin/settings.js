/**
 * GET  /api/admin/settings — list all known settings (with current values + defaults)
 * PUT  /api/admin/settings — bulk update: { values: { key: value, ... } }
 */

import { isAdmin } from './_auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });

// Canonical list of editable site settings.
// `default` shows what the site uses when DB has no value.
export const SETTINGS_SCHEMA = [
  { key: 'business_phone',          label: 'Phone number',         type: 'text',     default: '(336) 338-4912' },
  { key: 'business_email',          label: 'Public email',         type: 'email',    default: 'culinarymasterminds@gmail.com' },
  { key: 'business_instagram_url',  label: 'Instagram URL',        type: 'url',      default: 'https://www.instagram.com/culinarymasterminds' },
  { key: 'business_instagram_handle', label: 'Instagram handle',   type: 'text',     default: '@culinarymasterminds' },
  { key: 'business_service_area',   label: 'Service area (short)', type: 'text',     default: 'Gastonia, Charlotte, Greensboro & surrounding NC' },
  { key: 'business_tagline',        label: 'Tagline',              type: 'text',     default: 'A taste of Nigeria in North Carolina' },
  { key: 'business_address',        label: 'Physical address (optional)', type: 'text', default: '' },

  // Promo banner (top of every public page)
  { key: 'promo_active',            label: 'Promo banner — show?',       type: 'toggle',   default: '' },
  { key: 'promo_text',              label: 'Promo banner — text',        type: 'text',     default: '' },
  { key: 'promo_cta_text',          label: 'Promo banner — button text', type: 'text',     default: '' },
  { key: 'promo_cta_url',           label: 'Promo banner — button URL',  type: 'url',      default: '' },
];

const VALID_KEYS = new Set(SETTINGS_SCHEMA.map((s) => s.key));

async function ensureAuth(request, env) {
  const ok = await isAdmin(request, env);
  if (!ok) return json({ ok: false, error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ ok: false, error: 'No database configured' }, 500);
  return null;
}

export const onRequestGet = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;
  const { results } = await env.DB.prepare(`SELECT key, value FROM settings`).all();
  const map = Object.fromEntries((results || []).map((r) => [r.key, r.value]));
  const items = SETTINGS_SCHEMA.map((s) => ({ ...s, value: map[s.key] ?? '' }));
  return json({ ok: true, items });
};

export const onRequestPut = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'Invalid JSON' }, 400); }

  const values = (body && typeof body.values === 'object' && body.values) || {};
  const now = new Date().toISOString();

  const stmts = [];
  for (const [key, raw] of Object.entries(values)) {
    if (!VALID_KEYS.has(key)) continue;
    const value = (typeof raw === 'string' ? raw : '').trim().slice(0, 500);
    stmts.push(
      env.DB.prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      ).bind(key, value, now)
    );
  }
  if (stmts.length) await env.DB.batch(stmts);

  return json({ ok: true, updated: stmts.length });
};
