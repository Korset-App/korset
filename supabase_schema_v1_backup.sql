-- ============================================================
-- KÖRSET v15 — Полная схема базы данных
-- Зайди: Supabase → SQL Editor → New Query → вставь → Run
-- ============================================================

-- 1. Основная таблица товаров
CREATE TABLE IF NOT EXISTS products (
  id            TEXT PRIMARY KEY,
  ean           TEXT UNIQUE,
  name          TEXT NOT NULL,
  brand         TEXT,
  category      TEXT,
  shelf         TEXT,
  price_kzt     INTEGER,
  images        TEXT[],
  ingredients   TEXT,
  allergens     TEXT[],
  diet_tags     TEXT[],
  nutrition     JSONB,
  specs         JSONB,
  halal         BOOLEAN DEFAULT FALSE,
  quality_score INTEGER DEFAULT 50,
  store_id      BIGINT,
  source        TEXT DEFAULT 'manual',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Кэш из Open Food Facts
CREATE TABLE IF NOT EXISTS products_cache (
  id          BIGSERIAL PRIMARY KEY,
  ean         TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  brand       TEXT,
  ingredients TEXT,
  allergens   TEXT[],
  diet_tags   TEXT[],
  nutrition   JSONB,
  image       TEXT,
  source      TEXT DEFAULT 'openfoodfacts',
  cached_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Аналитика сканирований
CREATE TABLE IF NOT EXISTS scan_events (
  id          BIGSERIAL PRIMARY KEY,
  ean         TEXT NOT NULL,
  found       BOOLEAN NOT NULL,
  source      TEXT,
  store_id    BIGINT,
  scanned_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Магазины (для будущего кабинета)
CREATE TABLE IF NOT EXISTS stores (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  city          TEXT,
  address       TEXT,
  email         TEXT UNIQUE,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_products_ean       ON products(ean);
CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category);
CREATE INDEX IF NOT EXISTS idx_cache_ean          ON products_cache(ean);
CREATE INDEX IF NOT EXISTS idx_scans_ean          ON scan_events(ean);
CREATE INDEX IF NOT EXISTS idx_scans_store        ON scan_events(store_id);
CREATE INDEX IF NOT EXISTS idx_scans_date         ON scan_events(scanned_at);

-- RLS
ALTER TABLE products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_events    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read products"   ON products       FOR SELECT USING (true);
CREATE POLICY "insert products" ON products       FOR INSERT WITH CHECK (true);
CREATE POLICY "update products" ON products       FOR UPDATE USING (true);

CREATE POLICY "read cache"      ON products_cache FOR SELECT USING (true);
CREATE POLICY "insert cache"    ON products_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "update cache"    ON products_cache FOR UPDATE USING (true);

CREATE POLICY "insert scans"    ON scan_events    FOR INSERT WITH CHECK (true);
CREATE POLICY "read scans"      ON scan_events    FOR SELECT USING (true);
