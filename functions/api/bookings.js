/**
 * POST /api/bookings — public booking submission
 * Stores the booking in the D1 database bound as `DB`.
 *
 * Required env bindings (configured in Cloudflare dashboard or wrangler.toml):
 *   DB               -> D1 database
 *   ADMIN_EMAIL      -> notification email (optional, used for outbound webhook)
 *   NOTIFY_WEBHOOK   -> optional URL to POST new bookings to (e.g. Discord/Slack webhook)
 */

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

const cleanStr = (v, max = 2000) => {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
};

export const onRequestPost = async ({ request, env }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const name = cleanStr(body.name, 120);
  const email = cleanStr(body.email, 200);
  const phone = cleanStr(body.phone, 40);
  const event_type = cleanStr(body.event_type, 60);
  const event_date = cleanStr(body.event_date, 20);
  const guests = cleanStr(String(body.guests ?? ''), 10);
  const location = cleanStr(body.location, 200);
  const message = cleanStr(body.message, 4000);

  // Basic validation
  if (!name || !email || !event_type || !message) {
    return json({ ok: false, error: 'Please fill in name, email, event type, and message.' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: 'That email address looks invalid.' }, 400);
  }
  // Honeypot — if a field named "website" gets filled, treat as spam silently.
  if (cleanStr(body.website)) {
    return json({ ok: true });
  }

  const created_at = new Date().toISOString();
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ua = request.headers.get('User-Agent') || '';

  if (!env.DB) {
    return json({ ok: false, error: 'Server is not configured (no database). Please email us directly.' }, 500);
  }

  try {
    await env.DB.prepare(
      `INSERT INTO bookings (name, email, phone, event_type, event_date, guests, location, message, status, ip, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)`
    ).bind(name, email, phone, event_type, event_date, guests, location, message, ip, ua, created_at).run();
  } catch (err) {
    return json({ ok: false, error: 'Could not save your request. Please try again.' }, 500);
  }

  // Optional outbound notification (Discord / Slack-compatible webhook)
  if (env.NOTIFY_WEBHOOK) {
    const summary = `**New booking — ${event_type}**\n*${name}* (${email}${phone ? ', ' + phone : ''})\nDate: ${event_date || 'not set'} · Guests: ${guests || '—'} · Location: ${location || '—'}\n\n${message}`;
    try {
      await fetch(env.NOTIFY_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: summary, text: summary })
      });
    } catch { /* don't fail the booking if webhook fails */ }
  }

  return json({ ok: true });
};

export const onRequestOptions = () =>
  new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
