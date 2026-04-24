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
    // Site still works without a DB — just no edits.
    return json({ settings: {}, content: {}, testimonials: [] });
  }

  try {
    const [settingsRes, contentRes, testimonialsRes] = await Promise.all([
      env.DB.prepare(`SELECT key, value FROM settings`).all(),
      env.DB.prepare(`SELECT slot, value FROM content`).all(),
      env.DB.prepare(
        `SELECT id, quote, author FROM testimonials
         WHERE visible = 1
         ORDER BY display_order ASC, id ASC`
      ).all()
    ]);

    const settings = {};
    for (const r of (settingsRes.results || [])) {
      if (r.value && r.value.length) settings[r.key] = r.value;
    }

    const content = {};
    for (const r of (contentRes.results || [])) {
      if (r.value && r.value.length) content[r.slot] = r.value;
    }

    return json({
      settings,
      content,
      testimonials: testimonialsRes.results || []
    });
  } catch (err) {
    return json({ settings: {}, content: {}, testimonials: [] });
  }
};
