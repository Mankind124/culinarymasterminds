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
import { onRequestGet as siteGet } from '../functions/api/site.js';
import { onRequestGet as imgGet } from '../functions/api/img.js';

import { onRequestPost as adminLoginPost } from '../functions/api/admin/login.js';
import { onRequestPost as adminLogoutPost } from '../functions/api/admin/logout.js';
import { onRequestGet as adminSessionGet } from '../functions/api/admin/session.js';
import {
  onRequestGet as adminBookingsGet,
  onRequestPatch as adminBookingsPatch,
  onRequestDelete as adminBookingsDelete
} from '../functions/api/admin/bookings.js';
import {
  onRequestGet as adminSettingsGet,
  onRequestPut as adminSettingsPut
} from '../functions/api/admin/settings.js';
import {
  onRequestGet as adminContentGet,
  onRequestPut as adminContentPut
} from '../functions/api/admin/content.js';
import {
  onRequestGet as adminTestimonialsGet,
  onRequestPost as adminTestimonialsPost,
  onRequestPatch as adminTestimonialsPatch,
  onRequestDelete as adminTestimonialsDelete
} from '../functions/api/admin/testimonials.js';
import {
  onRequestGet as adminGalleryGet,
  onRequestPost as adminGalleryPost,
  onRequestPatch as adminGalleryPatch,
  onRequestDelete as adminGalleryDelete
} from '../functions/api/admin/gallery.js';

const routes = [
  ['POST',    '/api/bookings',             bookingsPost],
  ['OPTIONS', '/api/bookings',             bookingsOptions],
  ['GET',     '/api/site',                 siteGet],

  ['POST',    '/api/admin/login',          adminLoginPost],
  ['POST',    '/api/admin/logout',         adminLogoutPost],
  ['GET',     '/api/admin/session',        adminSessionGet],

  ['GET',     '/api/admin/bookings',       adminBookingsGet],
  ['PATCH',   '/api/admin/bookings',       adminBookingsPatch],
  ['DELETE',  '/api/admin/bookings',       adminBookingsDelete],

  ['GET',     '/api/admin/settings',       adminSettingsGet],
  ['PUT',     '/api/admin/settings',       adminSettingsPut],

  ['GET',     '/api/admin/content',        adminContentGet],
  ['PUT',     '/api/admin/content',        adminContentPut],

  ['GET',     '/api/admin/testimonials',   adminTestimonialsGet],
  ['POST',    '/api/admin/testimonials',   adminTestimonialsPost],
  ['PATCH',   '/api/admin/testimonials',   adminTestimonialsPatch],
  ['DELETE',  '/api/admin/testimonials',   adminTestimonialsDelete],

  ['GET',     '/api/admin/gallery',        adminGalleryGet],
  ['POST',    '/api/admin/gallery',        adminGalleryPost],
  ['PATCH',   '/api/admin/gallery',        adminGalleryPatch],
  ['DELETE',  '/api/admin/gallery',        adminGalleryDelete],
];

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Public R2-backed image serving: /img/<id>.<ext>
    if (request.method === 'GET' && url.pathname.startsWith('/img/')) {
      try {
        return await imgGet({ request, env });
      } catch {
        return new Response('Image error', { status: 500 });
      }
    }

    if (url.pathname.startsWith('/api/')) {
      for (const [method, path, handler] of routes) {
        if (request.method === method && url.pathname === path) {
          try {
            const res = await handler({ request, env });
            res.headers.set('X-Content-Type-Options', 'nosniff');
            res.headers.set('Referrer-Policy', 'no-referrer');
            return res;
          } catch (err) {
            return json({ ok: false, error: 'Server error' }, 500);
          }
        }
      }
      return json({ ok: false, error: 'Not found' }, 404);
    }

    return env.ASSETS.fetch(request);
  }
};
