/* Culinary Masterminds — public content loader
 *
 * Fetches /api/site once and applies admin-edited values to elements
 * marked with data-cm-* attributes. If the API is unreachable, the
 * page keeps its baked-in default text — so the site never goes blank.
 *
 * Conventions:
 *   data-cm="key"            → replaces textContent
 *   data-cm-html="key"       → replaces innerHTML (allows formatting like <em>)
 *   data-cm-href="key"       → sets href attribute
 *   data-cm-tel="key"        → sets href="tel:DIGITS"
 *   data-cm-mailto="key"     → sets href="mailto:..."
 *   data-cm-testimonials     → container; child [data-cm-testimonial-quote]
 *                              and [data-cm-testimonial-author] get filled
 */

(async function () {
  let data;
  try {
    const res = await fetch('/api/site', { cache: 'default' });
    if (!res.ok) return;
    data = await res.json();
  } catch { return; }
  if (!data) return;

  const all = Object.assign({}, data.settings || {}, data.content || {});

  const get = (key) => (key && Object.prototype.hasOwnProperty.call(all, key)) ? all[key] : null;

  document.querySelectorAll('[data-cm]').forEach((el) => {
    const v = get(el.getAttribute('data-cm'));
    if (v != null && v !== '') el.textContent = v;
  });

  document.querySelectorAll('[data-cm-html]').forEach((el) => {
    const v = get(el.getAttribute('data-cm-html'));
    if (v != null && v !== '') el.innerHTML = v;
  });

  document.querySelectorAll('[data-cm-href]').forEach((el) => {
    const v = get(el.getAttribute('data-cm-href'));
    if (v) el.setAttribute('href', v);
  });

  document.querySelectorAll('[data-cm-tel]').forEach((el) => {
    const v = get(el.getAttribute('data-cm-tel'));
    if (v) el.setAttribute('href', 'tel:+1' + v.replace(/\D/g, '').replace(/^1/, ''));
  });

  document.querySelectorAll('[data-cm-mailto]').forEach((el) => {
    const v = get(el.getAttribute('data-cm-mailto'));
    if (v) el.setAttribute('href', 'mailto:' + v);
  });

  // Testimonials — replaces the first visible one
  const tContainer = document.querySelector('[data-cm-testimonials]');
  if (tContainer && Array.isArray(data.testimonials) && data.testimonials.length) {
    const t = data.testimonials[0];
    const q = tContainer.querySelector('[data-cm-testimonial-quote]');
    const a = tContainer.querySelector('[data-cm-testimonial-author]');
    if (q && t.quote) q.textContent = t.quote;
    if (a && t.author) a.textContent = '— ' + t.author;
  }
})();
