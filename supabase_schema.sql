-- ============================================================
-- KÖRSET — Supabase Database Schema
-- Запусти этот файл в Supabase → SQL Editor → Run
-- ============================================================

-- 1. Кэш товаров из Open Food Facts + товары магазинов
CREATE TABLE IF NOT EXISTS products_cache (
  id          BIGSERIAL PRIMARY KEY,
  ean         TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  brand       TEXT,
  ingredients TEXT,
  allergens   TEXT[],         -- массив: ['milk', 'gluten', ...]
  diet_tags   TEXT[],         -- массив: ['vegan', 'halal', ...]
  nutrition   JSONB,          -- {calories, protein, fat, carbs, sugar, salt}
  image       TEXT,           -- URL картинки
  source      TEXT DEFAULT 'openfoodfacts',  -- openfoodfacts | manual | store
  store_id    BIGINT,         -- если добавлен магазином
  cached_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. События сканирования (аналитика)
CREATE TABLE IF NOT EXISTS scan_events (
  id          BIGSERIAL PRIMARY KEY,
  ean         TEXT NOT NULL,
  found       BOOLEAN NOT NULL,
  source      TEXT,           -- local | supabase | openfoodfacts | not_found
  store_id    BIGINT,
  scanned_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Магазины (для будущего личного кабинета)
CREATE TABLE IF NOT EXISTS stores (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  city        TEXT,
  address     TEXT,
  email       TEXT UNIQUE,
  password_hash TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_products_cache_ean ON products_cache(ean);
CREATE INDEX IF NOT EXISTS idx_scan_events_ean ON scan_events(ean);
CREATE INDEX IF NOT EXISTS idx_scan_events_store ON scan_events(store_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_date ON scan_events(scanned_at);

-- RLS (Row Level Security) — публичный доступ на чтение/запись для анонимных
ALTER TABLE products_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_events    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read products"  ON products_cache FOR SELECT USING (true);
CREATE POLICY "Public insert products" ON products_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Public upsert products" ON products_cache FOR UPDATE USING (true);

CREATE POLICY "Public insert scans"   ON scan_events    FOR INSERT WITH CHECK (true);

-- ============================================================
-- Готово! Теперь добавь в Vercel Environment Variables:
-- VITE_SUPABASE_URL     = https://xxxx.supabase.co
-- VITE_SUPABASE_ANON_KEY = eyJ...
-- ============================================================
