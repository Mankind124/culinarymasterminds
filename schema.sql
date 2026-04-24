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

-- ── Gallery images (metadata; bytes live in R2) ───────────────────────────
CREATE TABLE IF NOT EXISTS gallery_images (
  id            TEXT PRIMARY KEY,
  ext           TEXT NOT NULL,
  mime          TEXT NOT NULL,
  size          INTEGER NOT NULL,
  caption       TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  visible       INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gallery_visible_order
  ON gallery_images(visible DESC, display_order ASC, created_at DESC);

-- ── Menu categories + items ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_categories (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  visible       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS menu_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id   INTEGER NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  visible       INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_menu_items_cat_order
  ON menu_items(category_id, visible DESC, display_order ASC, id ASC);

-- Seed default categories (only if the table is empty)
INSERT INTO menu_categories (id, name, display_order, visible)
SELECT * FROM (
  SELECT 1 AS id, 'Mains' AS name, 0 AS display_order, 1 AS visible
  UNION ALL SELECT 2, 'Proteins', 1, 1
  UNION ALL SELECT 3, 'Small Chops & Sides', 2, 1
  UNION ALL SELECT 4, 'Drinks & Desserts', 3, 1
)
WHERE NOT EXISTS (SELECT 1 FROM menu_categories);

-- Seed default menu items (only if the table is empty)
INSERT INTO menu_items (category_id, name, description, display_order, visible)
SELECT * FROM (
  -- Mains
  SELECT 1 AS category_id, 'Jollof Rice' AS name, 'The classic — smoky, tomato-rich, party-perfect.' AS description, 0 AS display_order, 1 AS visible
  UNION ALL SELECT 1, 'Fried Rice', 'Nigerian-style fried rice with mixed vegetables and shrimp.', 1, 1
  UNION ALL SELECT 1, 'Pounded Yam & Egusi', 'Smooth pounded yam paired with rich melon-seed soup.', 2, 1
  UNION ALL SELECT 1, 'Amala & Ewedu', 'Yam flour with a savory leafy soup and assorted meats.', 3, 1
  UNION ALL SELECT 1, 'Eba & Okra Soup', 'Cassava swallow with okra soup loaded with seafood and meats.', 4, 1
  UNION ALL SELECT 1, 'Ofada Rice & Ayamase', 'Local rice with the iconic green pepper sauce.', 5, 1
  -- Proteins
  UNION ALL SELECT 2, 'Suya', 'Skewered, spiced grilled beef — bold and smoky.', 0, 1
  UNION ALL SELECT 2, 'Peppered Meat', 'Tender beef simmered in a vibrant pepper-onion stew.', 1, 1
  UNION ALL SELECT 2, 'Asun', 'Spicy, smoky goat meat — a celebrated party favorite.', 2, 1
  UNION ALL SELECT 2, 'Grilled Croaker / Tilapia', 'Whole fish marinated and grilled to order.', 3, 1
  UNION ALL SELECT 2, 'Peppered Chicken', 'Marinated, grilled, and finished in our signature pepper sauce.', 4, 1
  UNION ALL SELECT 2, 'Peppered Snail', 'A delicacy — tender snails in pepper sauce.', 5, 1
  -- Small Chops & Sides
  UNION ALL SELECT 3, 'Puff Puff', 'Soft, golden, sweet fried dough — a crowd favorite.', 0, 1
  UNION ALL SELECT 3, 'Meat Pies', 'Flaky pastries filled with seasoned beef and vegetables.', 1, 1
  UNION ALL SELECT 3, 'Spring Rolls & Samosas', 'Crispy parcels with savory fillings.', 2, 1
  UNION ALL SELECT 3, 'Gizdodo', 'Spiced gizzards and plantain in pepper sauce.', 3, 1
  UNION ALL SELECT 3, 'Moi Moi', 'Steamed bean pudding — soft, savory, and deeply flavored.', 4, 1
  UNION ALL SELECT 3, 'Plantain (Dodo)', 'Sweet, ripe plantains pan-fried to golden perfection.', 5, 1
  -- Drinks & Desserts
  UNION ALL SELECT 4, 'Chapman', 'Nigeria''s signature mocktail — refreshing and bright.', 0, 1
  UNION ALL SELECT 4, 'Zobo', 'Hibiscus drink, lightly sweetened and chilled.', 1, 1
  UNION ALL SELECT 4, 'Tigernut Drink (Kunu Aya)', 'Creamy, naturally sweet, and refreshing.', 2, 1
  UNION ALL SELECT 4, 'Chin Chin', 'Crunchy fried snack — perfect for grazing tables.', 3, 1
  UNION ALL SELECT 4, 'Coconut Candy', 'Sweet, chewy treats made with fresh coconut.', 4, 1
)
WHERE NOT EXISTS (SELECT 1 FROM menu_items);
