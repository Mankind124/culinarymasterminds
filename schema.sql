-- Cloudflare D1 schema for Culinary Masterminds.
-- Apply via the Cloudflare D1 Console (Workers & Pages → D1 → culinarymasterminds-db → Console).
-- Safe to re-run — every CREATE / INSERT uses IF NOT EXISTS / OR IGNORE.

-- ── Bookings ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  event_type  TEXT NOT NULL,
  event_date  TEXT,
  guests      TEXT,
  location    TEXT,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new',
  ip          TEXT,
  user_agent  TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- ── Site settings (key-value) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  updated_at  TEXT NOT NULL
);

-- ── Page content slots (key-value, dot-namespaced) ────────────────────────
CREATE TABLE IF NOT EXISTS content (
  slot        TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  updated_at  TEXT NOT NULL
);

-- ── Testimonials ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testimonials (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  quote         TEXT NOT NULL,
  author        TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  visible       INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_testimonials_visible_order
  ON testimonials(visible DESC, display_order ASC, id ASC);

-- ── Seed one testimonial (only if table is empty) ─────────────────────────
INSERT INTO testimonials (quote, author, display_order, visible, created_at)
SELECT
  'The food was incredible — every guest asked who catered. The presentation was stunning and the service made our day feel effortless.',
  'A Recent Wedding Client',
  0, 1, datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM testimonials);
