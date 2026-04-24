/**
 * Culinary Masterminds — Worker entry
 *
 * Routes /api/* to handlers, delegates everything else to static assets.
 * Designed for the Cloudflare Workers + Static Assets deployment model.
 */

import {
  onRequestPost as bookingsPost,
  onRequestOptions as bookingsOptions
} from '../functions/api/bookings.js';
import { onRequestPost as adminLoginPost } from '../functions/api/admin/login.js';
import { onRequestPost as adminLogoutPost } from '../functions/api/admin/logout.js';
import { onRequestGet as adminSessionGet } from '../functions/api/admin/session.js';
import {
  onRequestGet as adminBookingsGet,
  onRequestPatch as adminBookingsPatch,
  onRequestDelete as adminBookingsDelete
} from '../functions/api/admin/bookings.js';

const routes = [
  ['POST',    '/api/bookings',         bookingsPost],
  ['OPTIONS', '/api/bookings',         bookingsOptions],
  ['POST',    '/api/admin/login',      adminLoginPost],
  ['POST',    '/api/admin/logout',     adminLogoutPost],
  ['GET',     '/api/admin/session',    adminSessionGet],
  ['GET',     '/api/admin/bookings',   adminBookingsGet],
  ['PATCH',   '/api/admin/bookings',   adminBookingsPatch],
  ['DELETE',  '/api/admin/bookings',   adminBookingsDelete],
];

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      for (const [method, path, handler] of routes) {
        if (request.method === method && url.pathname === path) {
          try {
            const res = await handler({ request, env });
            res.headers.set('X-Content-Type-Options', 'nosniff');
            res.headers.set('Referrer-Policy', 'no-referrer');
            res.headers.set('Cache-Control', 'no-store');
            return res;
          } catch (err) {
            return json({ ok: false, error: 'Server error' }, 500);
          }
        }
      }
      return json({ ok: false, error: 'Not found' }, 404);
    }

    // Everything else: hand off to the static asset binding
    return env.ASSETS.fetch(request);
  }
};
