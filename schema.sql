-- Cloudflare D1 schema for Culinary Masterminds
-- Apply with: wrangler d1 execute culinarymasterminds-db --remote --file=./schema.sql

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
  status      TEXT NOT NULL DEFAULT 'new',  -- new | contacted | confirmed | archived
  ip          TEXT,
  user_agent  TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
