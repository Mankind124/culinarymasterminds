/**
 * GET /api/site — public, read-only site content blob.
 * Returns { settings, content, testimonials } so the frontend can swap in
 * any admin-edited values. Cached at the edge for 60 seconds.
 *
 * If a slot is NOT in `content`, the frontend keeps its hard-coded default
 * (so the site works fine if D1 is unreachable or empty).
 */

const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, s-maxage=60',
      ...extraHeaders
    }
  });

export const onRequestGet = async ({ env }) => {
  if (!env.DB) {
    return json({ settings: {}, content: {}, testimonials: [], gallery: [], menu: null });
  }

  const safe = (p) => p.catch(() => ({ results: [] }));

  try {
    const [settingsRes, contentRes, testimonialsRes, galleryRes, categoriesRes, itemsRes] = await Promise.all([
      env.DB.prepare(`SELECT key, value FROM settings`).all(),
      env.DB.prepare(`SELECT slot, value FROM content`).all(),
      env.DB.prepare(
        `SELECT id, quote, author FROM testimonials
         WHERE visible = 1 ORDER BY display_order ASC, id ASC`
      ).all(),
      safe(env.DB.prepare(
        `SELECT id, ext, caption FROM gallery_images
         WHERE visible = 1 ORDER BY display_order ASC, created_at DESC`
      ).all()),
      safe(env.DB.prepare(
        `SELECT id, name FROM menu_categories
         WHERE visible = 1 ORDER BY display_order ASC, id ASC`
      ).all()),
      safe(env.DB.prepare(
        `SELECT id, category_id, name, description FROM menu_items
         WHERE visible = 1 ORDER BY category_id ASC, display_order ASC, id ASC`
      ).all())
    ]);

    const settings = {};
    for (const r of (settingsRes.results || [])) {
      if (r.value && r.value.length) settings[r.key] = r.value;
    }

    const content = {};
    for (const r of (contentRes.results || [])) {
      if (r.value && r.value.length) content[r.slot] = r.value;
    }

    const gallery = (galleryRes.results || []).map((r) => ({
      id: r.id,
      url: `/img/${r.id}.${r.ext}`,
      caption: r.caption || ''
    }));

    // Build nested menu structure
    const cats = categoriesRes.results || [];
    const items = itemsRes.results || [];
    let menu = null;
    if (cats.length && items.length) {
      const byCat = new Map();
      for (const c of cats) byCat.set(c.id, { id: c.id, name: c.name, items: [] });
      for (const it of items) {
        const bucket = byCat.get(it.category_id);
        if (bucket) bucket.items.push({ id: it.id, name: it.name, description: it.description });
      }
      menu = Array.from(byCat.values()).filter((c) => c.items.length);
    }

    return json({
      settings,
      content,
      testimonials: testimonialsRes.results || [],
      gallery,
      menu
    });
  } catch (err) {
    return json({ settings: {}, content: {}, testimonials: [], gallery: [], menu: null });
  }
};
