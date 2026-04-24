/**
 * GET  /api/admin/content — list all editable content slots
 * PUT  /api/admin/content — bulk update: { values: { slot: value, ... } }
 */

import { isAdmin } from './_auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });

// Canonical list of editable text slots, grouped by page for the admin UI.
// `default` is the text the public site shows when the DB has no override.
export const CONTENT_SCHEMA = [
  // Home
  { slot: 'home.hero_eyebrow',  page: 'Home',     label: 'Hero eyebrow (small script line)', type: 'text',
    default: 'A taste of Nigeria' },
  { slot: 'home.hero_title',    page: 'Home',     label: 'Hero headline',                    type: 'html',
    default: 'Catering that makes <em>every gathering</em> unforgettable' },
  { slot: 'home.hero_subtitle', page: 'Home',     label: 'Hero subtitle',                    type: 'textarea',
    default: 'From intimate dinners to grand celebrations, we craft rich, flavorful Nigerian cuisine with stunning presentation and seamless service.' },
  { slot: 'home.intro_eyebrow', page: 'Home',     label: 'About — eyebrow',                  type: 'text',
    default: 'About Culinary Masterminds' },
  { slot: 'home.intro_title',   page: 'Home',     label: 'About — heading',                  type: 'text',
    default: 'Authentic flavor, thoughtfully presented.' },
  { slot: 'home.intro_body_1',  page: 'Home',     label: 'About — paragraph 1',              type: 'textarea',
    default: 'Culinary Masterminds is a licensed and insured catering company specializing in rich, flavorful dishes inspired by authentic Nigerian cuisine. Our team is committed to delivering exceptional taste, stunning presentation, and seamless service.' },
  { slot: 'home.intro_body_2',  page: 'Home',     label: 'About — paragraph 2',              type: 'textarea',
    default: "Whether it's an intimate gathering or grand celebration, every dish is thoughtfully prepared to reflect culture and creativity — because your special moments deserve nothing less." },
  { slot: 'home.cta_title',     page: 'Home',     label: 'Closing CTA — heading',            type: 'text',
    default: "Let's plan something delicious" },
  { slot: 'home.cta_body',      page: 'Home',     label: 'Closing CTA — body',               type: 'textarea',
    default: "Tell us about your event and we'll craft a menu that fits your vision, your guests, and your budget." },

  // About
  { slot: 'about.hero_title',     page: 'About',  label: 'Hero headline',                    type: 'text',
    default: 'A taste of home, shared with you' },
  { slot: 'about.hero_subtitle',  page: 'About',  label: 'Hero subtitle',                    type: 'textarea',
    default: 'Authentic Nigerian cuisine, crafted with intention and served with care.' },
  { slot: 'about.body_1',         page: 'About',  label: 'Story — paragraph 1',              type: 'textarea',
    default: 'We are a licensed and insured catering company based in Gastonia, North Carolina, specializing in rich, flavorful dishes inspired by authentic Nigerian cuisine.' },
  { slot: 'about.body_2',         page: 'About',  label: 'Story — paragraph 2',              type: 'textarea',
    default: "Every event we cater is shaped by three commitments: exceptional taste, stunning presentation, and seamless service. Whether you're hosting an intimate gathering or a grand celebration, every dish is thoughtfully prepared to reflect culture and creativity." },
  { slot: 'about.body_3',         page: 'About',  label: 'Story — paragraph 3',              type: 'textarea',
    default: 'Because your special moments deserve nothing less.' },

  // Services
  { slot: 'services.hero_title',    page: 'Services', label: 'Hero headline',                type: 'text',
    default: 'Crafted for every kind of celebration' },
  { slot: 'services.hero_subtitle', page: 'Services', label: 'Hero subtitle',                type: 'textarea',
    default: 'Full-service catering, drop-off catering, and chef-prepared private dinners.' },

  // Gallery
  { slot: 'gallery.hero_title',    page: 'Gallery',  label: 'Hero headline',                 type: 'text',
    default: 'Catered moments, beautifully served' },
  { slot: 'gallery.hero_subtitle', page: 'Gallery',  label: 'Hero subtitle',                 type: 'textarea',
    default: 'A few of our recent events. Tap any image to view it larger.' },

  // Contact
  { slot: 'contact.hero_title',    page: 'Contact',  label: 'Hero headline',                 type: 'text',
    default: "Let's plan your event" },
  { slot: 'contact.hero_subtitle', page: 'Contact',  label: 'Hero subtitle',                 type: 'textarea',
    default: "Tell us about your occasion and we'll be in touch within 24 hours." },
];

const VALID_SLOTS = new Set(CONTENT_SCHEMA.map((s) => s.slot));

async function ensureAuth(request, env) {
  const ok = await isAdmin(request, env);
  if (!ok) return json({ ok: false, error: 'Unauthorized' }, 401);
  if (!env.DB) return json({ ok: false, error: 'No database configured' }, 500);
  return null;
}

export const onRequestGet = async ({ request, env }) => {
  const fail = await ensureAuth(request, env); if (fail) return fail;
  const { results } = await env.DB.prepare(`SELECT slot, value FROM content`).all();
  const map = Object.fromEntries((results || []).map((r) => [r.slot, r.value]));
  const items = CONTENT_SCHEMA.map((s) => ({ ...s, value: map[s.slot] ?? '' }));
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
  for (const [slot, raw] of Object.entries(values)) {
    if (!VALID_SLOTS.has(slot)) continue;
    const value = (typeof raw === 'string' ? raw : '').trim().slice(0, 4000);
    stmts.push(
      env.DB.prepare(
        `INSERT INTO content (slot, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(slot) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      ).bind(slot, value, now)
    );
  }
  if (stmts.length) await env.DB.batch(stmts);

  return json({ ok: true, updated: stmts.length });
};
