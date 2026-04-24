/**
 * POST /api/bookings — public booking submission
 * Stores the booking in the D1 database bound as `DB`.
 *
 * Env bindings (set in Cloudflare dashboard):
 *   DB                -> D1 database (required)
 *   RESEND_API_KEY    -> Resend.com API key for email notifications (optional)
 *   NOTIFY_EMAIL      -> destination email for new-booking alerts (defaults to culinarymasterminds@gmail.com)
 *   EMAIL_FROM        -> sender (defaults to "Culinary Masterminds <onboarding@resend.dev>")
 *   NOTIFY_WEBHOOK    -> optional Discord/Slack-style webhook URL
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

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

async function sendBookingEmail(env, b) {
  if (!env.RESEND_API_KEY) return { skipped: true };
  const to = env.NOTIFY_EMAIL || 'culinarymasterminds@gmail.com';
  const from = env.EMAIL_FROM || 'Culinary Masterminds <onboarding@resend.dev>';

  const safe = (k) => escapeHtml(b[k] ?? '');
  const subject = `New booking — ${b.event_type} for ${b.name}`;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#faf5ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1614;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#b8736f;color:#fffaf3;padding:24px;text-align:center;border-radius:6px 6px 0 0;">
      <div style="font-family:Georgia,serif;font-size:28px;letter-spacing:.02em;">New Booking Request</div>
      <div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;margin-top:4px;opacity:.85;">Culinary Masterminds</div>
    </div>
    <div style="background:#fffaf3;padding:28px;border-radius:0 0 6px 6px;border:1px solid #e8ddd0;border-top:none;">
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr><td style="padding:8px 0;color:#a07f3a;text-transform:uppercase;font-size:11px;letter-spacing:.2em;width:120px;">Name</td><td style="padding:8px 0;font-weight:600;">${safe('name')}</td></tr>
        <tr><td style="padding:8px 0;color:#a07f3a;text-transform:uppercase;font-size:11px;letter-spacing:.2em;">Email</td><td style="padding:8px 0;"><a href="mailto:${safe('email')}" style="color:#b8736f;">${safe('email')}</a></td></tr>
        ${b.phone ? `<tr><td style="padding:8px 0;color:#a07f3a;text-transform:uppercase;font-size:11px;letter-spacing:.2em;">Phone</td><td style="padding:8px 0;"><a href="tel:${safe('phone')}" style="color:#b8736f;">${safe('phone')}</a></td></tr>` : ''}
        <tr><td style="padding:8px 0;color:#a07f3a;text-transform:uppercase;font-size:11px;letter-spacing:.2em;">Event</td><td style="padding:8px 0;font-weight:600;">${safe('event_type')}</td></tr>
        ${b.event_date ? `<tr><td style="padding:8px 0;color:#a07f3a;text-transform:uppercase;font-size:11px;letter-spacing:.2em;">Date</td><td style="padding:8px 0;">${safe('event_date')}</td></tr>` : ''}
        ${b.guests ? `<tr><td style="padding:8px 0;color:#a07f3a;text-transform:uppercase;font-size:11px;letter-spacing:.2em;">Guests</td><td style="padding:8px 0;">${safe('guests')}</td></tr>` : ''}
        ${b.location ? `<tr><td style="padding:8px 0;color:#a07f3a;text-transform:uppercase;font-size:11px;letter-spacing:.2em;">Location</td><td style="padding:8px 0;">${safe('location')}</td></tr>` : ''}
      </table>
      <div style="margin-top:24px;padding-top:24px;border-top:1px solid #e8ddd0;">
        <div style="color:#a07f3a;text-transform:uppercase;font-size:11px;letter-spacing:.2em;margin-bottom:8px;">Message</div>
        <div style="white-space:pre-wrap;line-height:1.6;color:#1a1614;">${escapeHtml(b.message).replace(/\n/g, '<br/>')}</div>
      </div>
      <div style="margin-top:28px;text-align:center;">
        <a href="https://culinarymasterminds.com/admin/" style="display:inline-block;background:#1a1614;color:#fffaf3;padding:12px 24px;text-decoration:none;border-radius:2px;font-size:13px;letter-spacing:.1em;text-transform:uppercase;">Open admin dashboard</a>
      </div>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e8ddd0;font-size:12px;color:#6b625b;text-align:center;">
        Reply to this email to write back to ${safe('name')}.
      </div>
    </div>
  </div>
</body></html>`;

  const text = `New booking — ${b.event_type}
From: ${b.name} <${b.email}>${b.phone ? ' · ' + b.phone : ''}
Event: ${b.event_type}${b.event_date ? ' on ' + b.event_date : ''}
Guests: ${b.guests || '—'}
Location: ${b.location || '—'}

${b.message}

— Reply to this email to respond directly to ${b.name}.
View in admin: https://culinarymasterminds.com/admin/`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: b.email,
        subject,
        html,
        text
      })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, status: res.status, error: errText.slice(0, 300) };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err).slice(0, 300) };
  }
}

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

  // Email notification (Resend) — fire-and-forget; don't fail the booking if email fails
  const bookingPayload = { name, email, phone, event_type, event_date, guests, location, message };
  try { await sendBookingEmail(env, bookingPayload); } catch { /* swallow */ }

  // Optional outbound webhook (Discord / Slack-compatible)
  if (env.NOTIFY_WEBHOOK) {
    const summary = `**New booking — ${event_type}**\n*${name}* (${email}${phone ? ', ' + phone : ''})\nDate: ${event_date || 'not set'} · Guests: ${guests || '—'} · Location: ${location || '—'}\n\n${message}`;
    try {
      await fetch(env.NOTIFY_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: summary, text: summary })
      });
    } catch { /* swallow */ }
  }

  return json({ ok: true });
};

export const onRequestOptions = () =>
  new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
