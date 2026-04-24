/**
 * POST /api/admin/test-email — admin diagnostic.
 * Sends a test email via Resend using current env bindings and returns
 * the raw response so we can see exactly what's failing.
 */

import { isAdmin } from './_auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });

export const onRequestPost = async ({ request, env }) => {
  if (!(await isAdmin(request, env))) return json({ ok: false, error: 'Unauthorized' }, 401);

  const report = {
    has_resend_key: !!env.RESEND_API_KEY,
    resend_key_length: env.RESEND_API_KEY ? env.RESEND_API_KEY.length : 0,
    resend_key_prefix: env.RESEND_API_KEY ? env.RESEND_API_KEY.slice(0, 3) : null,
    notify_email_env: env.NOTIFY_EMAIL || null,
    email_from_env: env.EMAIL_FROM || null
  };

  if (!env.RESEND_API_KEY) {
    return json({
      ok: false,
      error: 'RESEND_API_KEY is not set as a Secret on the Worker.',
      report
    });
  }

  const to = env.NOTIFY_EMAIL || 'culinarymasterminds@gmail.com';
  const from = env.EMAIL_FROM || 'Culinary Masterminds <onboarding@resend.dev>';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: 'Culinary Masterminds — test email',
        html: '<p>If you received this, Resend is wired up correctly. Safe to ignore.</p>',
        text: 'Culinary Masterminds — test email. If you got this, Resend is working.'
      })
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return json({
      ok: res.ok,
      status: res.status,
      attempted_from: from,
      attempted_to: to,
      resend_response: body,
      report
    });
  } catch (err) {
    return json({ ok: false, error: String(err), report });
  }
};
