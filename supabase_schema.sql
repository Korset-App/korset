-- ================================================================
-- KÖRSET — Финальная схема БД v3 (production-ready)
-- Объединяет лучшее из двух вариантов
--
-- ПОРЯДОК ВЫПОЛНЕНИЯ:
--   Шаг 1 — Удаление старых таблиц (DROP)
--   Шаг 2 — Расширения
--   Шаг 3 — Новые таблицы
--   Шаг 4 — Индексы
--   Шаг 5 — Триггеры
--   Шаг 6 — RLS политики
--   Шаг 7 — Вьюхи для аналитики
-- ================================================================


-- ================================================================
-- ШАГ 1 — ЧИСТЫЙ ЛИСТ: удаляем все старые таблицы
-- ================================================================
DROP TABLE IF EXISTS product_reviews    CASCADE;
DROP TABLE IF EXISTS user_favorites     CASCADE;
DROP TABLE IF EXISTS scan_events        CASCADE;
DROP TABLE IF EXISTS store_products     CASCADE;
DROP TABLE IF EXISTS products_cache     CASCADE;
DROP TABLE IF EXISTS products           CASCADE;
DROP TABLE IF EXISTS users              CASCADE;
DROP TABLE IF EXISTS stores             CASCADE;
-- на случай если GPT уже создал свои
DROP TABLE IF EXISTS scan_events_v2     CASCADE;
DROP TABLE IF EXISTS global_products    CASCADE;
DROP TABLE IF EXISTS external_product_cache CASCADE;
DROP TABLE IF EXISTS product_matches    CASCADE;
DROP TABLE IF EXISTS missing_products   CASCADE;

DROP VIEW  IF EXISTS store_top_scans        CASCADE;
DROP VIEW  IF EXISTS store_missing_products CASCADE;
DROP VIEW  IF EXISTS product_rating_summary CASCADE;

DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS compute_quality_score(products) CASCADE;


-- ================================================================
-- ШАГ 2 — РАСШИРЕНИЯ
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID генерация
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- полнотекстовый поиск


-- ================================================================
-- ШАГ 3 — ТАБЛИЦЫ
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 3.1  STORES — B2B клиенты (магазины)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE stores (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  code             TEXT UNIQUE,          -- короткий slug: 'al-baraka-usk'
  name             TEXT NOT NULL,
  city             TEXT NOT NULL DEFAULT 'Усть-Каменогорск',
  address          TEXT,
  phone            TEXT,
  email            TEXT,
  type             TEXT DEFAULT 'supermarket'
                     CHECK (type IN ('supermarket','minimarket','halal','specialty','other')),

  -- Тариф
  plan             TEXT NOT NULL DEFAULT 'pilot'
                     CHECK (plan IN ('pilot','basic','pro','enterprise')),
  plan_expires_at  TIMESTAMPTZ,

  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  stores            IS 'B2B клиенты — офлайн магазины';
COMMENT ON COLUMN stores.owner_id   IS 'Supabase Auth — владелец B2B кабинета';
COMMENT ON COLUMN stores.code       IS 'Человекочитаемый slug для QR и URL';
COMMENT ON COLUMN stores.plan       IS 'pilot=бесплатно 1 мес, basic=15к₸, pro=30к₸, enterprise=50к₸+';


-- ────────────────────────────────────────────────────────────────
-- 3.2  GLOBAL_PRODUCTS — глобальный каталог Körset
--      Source of truth для карточки товара
--      Один EAN = одна запись, независимо от магазина
-- ────────────────────────────────────────────────────────────────
CREATE TABLE global_products (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ean                  TEXT UNIQUE NOT NULL,

  -- Основные данные
  name                 TEXT NOT NULL,
  name_kz              TEXT,
  brand                TEXT,
  category             TEXT,
  subcategory          TEXT,
  quantity             TEXT,              -- '500 мл', '1 кг'

  -- Медиа
  image_url            TEXT,
  images               TEXT[] DEFAULT '{}',

  -- Состав и питание
  ingredients_raw      TEXT,
  ingredients_kz       TEXT,
  nutriments_json      JSONB DEFAULT '{}',
  -- { kcal, protein, fat, carbs, sugar, fiber, salt, saturated_fat }

  -- Аллергены и диета
  allergens_json       JSONB DEFAULT '[]',
  -- ['milk','gluten','nuts','peanuts','soy','eggs','fish','shellfish']
  diet_tags_json       JSONB DEFAULT '[]',
  -- ['halal','vegan','vegetarian','sugar_free','gluten_free','dairy_free']

  -- Халал — отдельно, важно для РК
  halal_status         TEXT NOT NULL DEFAULT 'unknown'
                         CHECK (halal_status IN ('yes','no','unknown')),

  -- Качество данных
  nutriscore           CHAR(1) CHECK (nutriscore IN ('A','B','C','D','E')),
  data_quality_score   SMALLINT DEFAULT 0 CHECK (data_quality_score BETWEEN 0 AND 100),
  source_primary       TEXT DEFAULT 'manual'
                         CHECK (source_primary IN ('manual','openfoodfacts','store_import','ai_enriched')),
  source_confidence    SMALLINT DEFAULT 50 CHECK (source_confidence BETWEEN 0 AND 100),
  needs_review         BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified          BOOLEAN NOT NULL DEFAULT FALSE,

  -- Производитель
  manufacturer         TEXT,
  country_of_origin    TEXT,

  specs_json           JSONB DEFAULT '{}',  -- доп. характеристики (вес упаковки, штук в блоке)

  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  global_products                  IS 'Глобальный каталог Körset — source of truth';
COMMENT ON COLUMN global_products.halal_status     IS 'yes/no/unknown — различаем "точно нет" и "неизвестно"';
COMMENT ON COLUMN global_products.data_quality_score IS '0-100: растёт по мере заполнения полей';
COMMENT ON COLUMN global_products.needs_review     IS 'TRUE = данные из OFF, ждут ручной проверки';


-- ────────────────────────────────────────────────────────────────
-- 3.3  STORE_PRODUCTS — ассортимент конкретного магазина
--      Цена, полка, наличие — специфично для каждого магазина
-- ────────────────────────────────────────────────────────────────
CREATE TABLE store_products (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id          UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  global_product_id UUID REFERENCES global_products(id) ON DELETE SET NULL,
  ean               TEXT NOT NULL,       -- дублируем для быстрого lookup без JOIN

  -- Данные магазина
  local_name        TEXT,                -- название в прайсе магазина (может отличаться)
  local_sku         TEXT,                -- внутренний артикул магазина
  price_kzt         INTEGER CHECK (price_kzt >= 0),
  stock_status      TEXT DEFAULT 'in_stock'
                      CHECK (stock_status IN ('in_stock','low_stock','out_of_stock')),
  shelf_zone        TEXT,                -- 'Молочный ряд', 'Зона A'
  shelf_position    TEXT,                -- 'A3-2', конкретная полка

  -- Промо
  is_promoted       BOOLEAN NOT NULL DEFAULT FALSE,
  promoted_until    TIMESTAMPTZ,

  last_seen_at      TIMESTAMPTZ DEFAULT NOW(),  -- когда последний раз был в прайсе
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (store_id, ean)
);

COMMENT ON TABLE  store_products               IS 'Цена и полка конкретного магазина';
COMMENT ON COLUMN store_products.local_name    IS 'Название из прайса магазина (может отличаться от global)';
COMMENT ON COLUMN store_products.local_sku     IS 'Внутренний артикул — нужен при импорте из 1С/Excel';
COMMENT ON COLUMN store_products.last_seen_at  IS 'Обновляется при каждом импорте прайса';


-- ────────────────────────────────────────────────────────────────
-- 3.4  PRODUCT_MATCHES — история матчинга
--      Как store_product был привязан к global_product
-- ────────────────────────────────────────────────────────────────
CREATE TABLE product_matches (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_product_id    UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  global_product_id   UUID NOT NULL REFERENCES global_products(id) ON DELETE CASCADE,
  match_method        TEXT NOT NULL
                        CHECK (match_method IN ('ean_exact','name_fuzzy','manual','ai')),
  match_confidence    SMALLINT DEFAULT 100 CHECK (match_confidence BETWEEN 0 AND 100),
  is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE product_matches IS 'Лог: как именно store_product привязан к global_product';


-- ────────────────────────────────────────────────────────────────
-- 3.5  EXTERNAL_PRODUCT_CACHE — кэш внешних источников (OFF)
--      Сырьё, не source of truth
-- ────────────────────────────────────────────────────────────────
CREATE TABLE external_product_cache (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ean                   TEXT UNIQUE NOT NULL,
  source                TEXT NOT NULL DEFAULT 'openfoodfacts'
                          CHECK (source IN ('openfoodfacts','kazfood','manual')),

  -- Сырые данные из источника
  raw_payload           JSONB NOT NULL DEFAULT '{}',

  -- Нормализованные поля (для быстрого чтения без парсинга raw)
  normalized_name       TEXT,
  normalized_brand      TEXT,
  normalized_ingredients TEXT,
  normalized_allergens_json  JSONB DEFAULT '[]',
  normalized_diet_tags_json  JSONB DEFAULT '[]',
  normalized_nutriments_json JSONB DEFAULT '{}',
  image_url             TEXT,
  nutriscore            CHAR(1),

  -- Статистика
  scan_count            INTEGER NOT NULL DEFAULT 1,

  -- Статус: перенесён ли в global_products
  promoted              BOOLEAN NOT NULL DEFAULT FALSE,
  global_product_id     UUID REFERENCES global_products(id) ON DELETE SET NULL,

  cached_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  external_product_cache            IS 'Кэш OFF и других внешних источников — не source of truth';
COMMENT ON COLUMN external_product_cache.scan_count IS 'Популярные EAN идут первыми на верификацию';
COMMENT ON COLUMN external_product_cache.promoted   IS 'TRUE = перенесён в global_products';


-- ────────────────────────────────────────────────────────────────
-- 3.6  MISSING_PRODUCTS — товары которые ищут но не находят
--      Отдельная таблица (не просто VIEW) — можно отметить resolved
-- ────────────────────────────────────────────────────────────────
CREATE TABLE missing_products (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id                 UUID REFERENCES stores(id) ON DELETE SET NULL,
  ean                      TEXT NOT NULL,
  scan_count               INTEGER NOT NULL DEFAULT 1,
  first_seen_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Статус обработки
  resolved                 BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_global_product_id UUID REFERENCES global_products(id) ON DELETE SET NULL,
  notes                    TEXT,   -- 'добавлено в каталог', 'дубль EAN'

  UNIQUE (store_id, ean)
);

COMMENT ON TABLE missing_products IS 'EAN которые сканируют но не находят — очередь для наполнения каталога';


-- ────────────────────────────────────────────────────────────────
-- 3.7  USERS — покупатели приложения
-- ────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id   TEXT NOT NULL,
  name        TEXT,
  lang        TEXT NOT NULL DEFAULT 'ru' CHECK (lang IN ('ru','kz')),
  preferences JSONB NOT NULL DEFAULT '{}',
  -- preferences: { halal, allergens[], dietGoals[], priority }
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users           IS 'Покупатели — анонимные через device_id, опционально с аккаунтом';
COMMENT ON COLUMN users.auth_id   IS 'NULL = анонимный пользователь';
COMMENT ON COLUMN users.preferences IS 'Зеркало localStorage профиля для серверной персонализации';


-- ────────────────────────────────────────────────────────────────
-- 3.8  SCAN_EVENTS — полная аналитика каждого сканирования
-- ────────────────────────────────────────────────────────────────
CREATE TABLE scan_events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Что сканировали
  ean                 TEXT NOT NULL,
  global_product_id   UUID REFERENCES global_products(id) ON DELETE SET NULL,
  store_product_id    UUID REFERENCES store_products(id)  ON DELETE SET NULL,

  -- Где и кто
  store_id            UUID REFERENCES stores(id) ON DELETE SET NULL,
  user_id             UUID REFERENCES users(id)  ON DELETE SET NULL,
  device_id           TEXT,
  session_id          TEXT,   -- UUID генерируется на клиенте при открытии приложения

  -- Результат поиска
  found_status        TEXT NOT NULL DEFAULT 'not_found'
                        CHECK (found_status IN (
                          'found_store',    -- в store_products магазина
                          'found_global',   -- в global_products
                          'found_cache',    -- в external_product_cache
                          'found_off',      -- свежий запрос в OFF
                          'not_found'
                        )),

  -- Результат для пользователя
  fit_result          BOOLEAN,              -- NULL если профиль не настроен
  fit_reasons_json    JSONB DEFAULT '[]',   -- ['halal_fail','allergen:milk',...]

  -- Поведение пользователя
  opened_alternatives BOOLEAN DEFAULT FALSE,
  opened_ai           BOOLEAN DEFAULT FALSE,

  app_version         TEXT,
  scanned_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE scan_events IS 'Главная аналитика — каждое сканирование';
COMMENT ON COLUMN scan_events.found_status      IS 'Откуда пришли данные';
COMMENT ON COLUMN scan_events.fit_reasons_json  IS 'Почему не подошёл: [halal_fail, allergen:milk, ...]';
COMMENT ON COLUMN scan_events.opened_alternatives IS 'Пользователь открыл вкладку Альтернативы';
COMMENT ON COLUMN scan_events.opened_ai           IS 'Пользователь нажал Спросить AI';


-- ────────────────────────────────────────────────────────────────
-- 3.9  USER_FAVORITES — избранные товары
-- ────────────────────────────────────────────────────────────────
CREATE TABLE user_favorites (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  global_product_id UUID REFERENCES global_products(id) ON DELETE CASCADE,
  ean               TEXT NOT NULL,   -- храним EAN даже если товара ещё нет в global
  added_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, ean)
);


-- ────────────────────────────────────────────────────────────────
-- 3.10 PRODUCT_REVIEWS — рейтинги и отзывы
-- ────────────────────────────────────────────────────────────────
CREATE TABLE product_reviews (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  global_product_id    UUID NOT NULL REFERENCES global_products(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating               SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text                 TEXT,
  is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (global_product_id, user_id)
);


-- ================================================================
-- ШАГ 4 — ИНДЕКСЫ
-- ================================================================

-- global_products
CREATE INDEX idx_gp_ean           ON global_products(ean);
CREATE INDEX idx_gp_category      ON global_products(category);
CREATE INDEX idx_gp_halal         ON global_products(halal_status) WHERE halal_status = 'yes';
CREATE INDEX idx_gp_needs_review  ON global_products(needs_review) WHERE needs_review = TRUE;
CREATE INDEX idx_gp_active        ON global_products(is_active)    WHERE is_active = TRUE;
CREATE INDEX idx_gp_name_trgm     ON global_products USING GIN (name gin_trgm_ops);  -- полнотекст

-- store_products
CREATE INDEX idx_sp_store         ON store_products(store_id);
CREATE INDEX idx_sp_ean           ON store_products(ean);
CREATE INDEX idx_sp_store_ean     ON store_products(store_id, ean);   -- главный lookup
CREATE INDEX idx_sp_global        ON store_products(global_product_id);
CREATE INDEX idx_sp_promoted      ON store_products(store_id, is_promoted) WHERE is_promoted = TRUE;

-- external_product_cache
CREATE INDEX idx_cache_ean        ON external_product_cache(ean);
CREATE INDEX idx_cache_popular    ON external_product_cache(scan_count DESC);
CREATE INDEX idx_cache_promoted   ON external_product_cache(promoted) WHERE promoted = FALSE;

-- missing_products
CREATE INDEX idx_missing_store    ON missing_products(store_id);
CREATE INDEX idx_missing_ean      ON missing_products(ean);
CREATE INDEX idx_missing_active   ON missing_products(resolved) WHERE resolved = FALSE;

-- scan_events
CREATE INDEX idx_scans_store      ON scan_events(store_id);
CREATE INDEX idx_scans_ean        ON scan_events(ean);
CREATE INDEX idx_scans_date       ON scan_events(scanned_at DESC);
CREATE INDEX idx_scans_store_date ON scan_events(store_id, scanned_at DESC);  -- главный запрос аналитики
CREATE INDEX idx_scans_device     ON scan_events(device_id);
CREATE INDEX idx_scans_session    ON scan_events(session_id);

-- users
CREATE INDEX idx_users_auth       ON users(auth_id)   WHERE auth_id IS NOT NULL;
CREATE INDEX idx_users_device     ON users(device_id);

-- favorites / reviews
CREATE INDEX idx_fav_user         ON user_favorites(user_id);
CREATE INDEX idx_rev_product      ON product_reviews(global_product_id);


-- ================================================================
-- ШАГ 5 — ТРИГГЕРЫ updated_at
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN CREATE TRIGGER trg_stores_upd
  BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TRIGGER trg_gp_upd
  BEFORE UPDATE ON global_products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TRIGGER trg_sp_upd
  BEFORE UPDATE ON store_products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TRIGGER trg_cache_upd
  BEFORE UPDATE ON external_product_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TRIGGER trg_users_upd
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- ШАГ 6 — RLS (Row Level Security)
--
-- Философия:
--   anon key (клиент)  — читает каталог, пишет сканы
--   authenticated      — читает свой профиль, пишет избранное
--   owner (магазин)    — видит только свою аналитику
--   service_role       — полный доступ (импорт, AI, cron)
-- ================================================================

ALTER TABLE stores                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_product_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE missing_products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_matches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews        ENABLE ROW LEVEL SECURITY;

-- global_products: все читают активные, пишет только service_role
CREATE POLICY "gp_read"   ON global_products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "gp_write"  ON global_products FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- store_products: все читают активные, пишет владелец магазина
CREATE POLICY "sp_read"   ON store_products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "sp_write"  ON store_products FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- stores: только владелец видит свои
CREATE POLICY "stores_read"   ON stores FOR SELECT
  USING (owner_id = auth.uid() OR auth.role() = 'service_role');
CREATE POLICY "stores_update" ON stores FOR UPDATE
  USING (owner_id = auth.uid());

-- external_product_cache: все читают и пишут (anon key)
CREATE POLICY "cache_select" ON external_product_cache FOR SELECT USING (TRUE);
CREATE POLICY "cache_insert" ON external_product_cache FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "cache_update" ON external_product_cache FOR UPDATE USING (TRUE);

-- missing_products: пишут все (anon), читает владелец магазина
CREATE POLICY "missing_insert" ON missing_products FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "missing_read"   ON missing_products FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
         OR auth.role() = 'service_role');
CREATE POLICY "missing_update" ON missing_products FOR UPDATE
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
         OR auth.role() = 'service_role');

-- product_matches: service_role
CREATE POLICY "matches_all" ON product_matches FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- scan_events: пишут все, читает только владелец своего магазина
CREATE POLICY "scans_insert" ON scan_events FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "scans_read"   ON scan_events FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
         OR auth.role() = 'service_role');

-- users: видят только свой профиль
CREATE POLICY "users_read"   ON users FOR SELECT
  USING (auth_id = auth.uid() OR auth.role() = 'service_role');
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "users_update" ON users FOR UPDATE
  USING (auth_id = auth.uid() OR auth.role() = 'service_role');

-- user_favorites: только свои
CREATE POLICY "fav_own" ON user_favorites FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- product_reviews: читают все, пишет автор
CREATE POLICY "rev_read"  ON product_reviews FOR SELECT USING (TRUE);
CREATE POLICY "rev_write" ON product_reviews FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));


-- ================================================================
-- ШАГ 7 — ВЬЮХИ для B2B кабинета
-- ================================================================

-- Топ сканируемых товаров магазина за 30 дней
CREATE OR REPLACE VIEW store_top_scans AS
SELECT
  s.store_id,
  s.ean,
  gp.name                                                        AS product_name,
  gp.brand,
  COUNT(*)                                                       AS scan_count,
  COUNT(*) FILTER (WHERE s.fit_result = FALSE)                  AS no_fit_count,
  ROUND(
    COUNT(*) FILTER (WHERE s.fit_result = FALSE)::NUMERIC
    / NULLIF(COUNT(*), 0) * 100, 1
  )                                                              AS no_fit_pct,
  COUNT(*) FILTER (WHERE s.opened_ai = TRUE)                    AS ai_opens,
  COUNT(*) FILTER (WHERE s.opened_alternatives = TRUE)          AS alt_opens,
  MAX(s.scanned_at)                                             AS last_scanned_at
FROM scan_events s
LEFT JOIN global_products gp ON gp.ean = s.ean
WHERE s.scanned_at > NOW() - INTERVAL '30 days'
  AND s.store_id IS NOT NULL
GROUP BY s.store_id, s.ean, gp.name, gp.brand
ORDER BY scan_count DESC;

-- Нерешённые "пропавшие" товары по магазину
CREATE OR REPLACE VIEW store_missing_unresolved AS
SELECT
  store_id,
  ean,
  scan_count,
  first_seen_at,
  last_seen_at,
  notes
FROM missing_products
WHERE resolved = FALSE
ORDER BY scan_count DESC;

-- Средний рейтинг товаров
CREATE OR REPLACE VIEW product_rating_summary AS
SELECT
  global_product_id,
  COUNT(*)              AS review_count,
  ROUND(AVG(rating), 2) AS avg_rating
FROM product_reviews
GROUP BY global_product_id;

-- Сводка по магазину за последние 7 дней (для дашборда)
CREATE OR REPLACE VIEW store_week_summary AS
SELECT
  store_id,
  COUNT(*)                                       AS total_scans,
  COUNT(DISTINCT device_id)                      AS unique_users,
  COUNT(*) FILTER (WHERE found_status = 'not_found') AS not_found_count,
  COUNT(*) FILTER (WHERE fit_result = FALSE)     AS no_fit_count,
  COUNT(*) FILTER (WHERE opened_ai = TRUE)       AS ai_opens,
  ROUND(
    COUNT(*) FILTER (WHERE fit_result = FALSE)::NUMERIC
    / NULLIF(COUNT(*), 0) * 100, 1
  )                                              AS no_fit_pct
FROM scan_events
WHERE scanned_at > NOW() - INTERVAL '7 days'
  AND store_id IS NOT NULL
GROUP BY store_id;


-- ================================================================
-- СПРАВКА ДЛЯ РАЗРАБОТЧИКА
-- ================================================================
/*
  LOOKUP FLOW при сканировании EAN:
  ──────────────────────────────────
  1. store_products WHERE store_id=X AND ean=Y AND is_active=TRUE
     → нашли: берём цену/полку + JOIN global_products для состава
  2. global_products WHERE ean=Y
     → нашли: показываем карточку (без цены)
  3. external_product_cache WHERE ean=Y
     → нашли: показываем кэш
  4. Open Food Facts API
     → нашли: UPSERT external_product_cache, UPSERT missing_products
  5. Не найдено → UPSERT missing_products(scan_count++)
  В любом случае → INSERT scan_events

  ИМПОРТ КАТАЛОГА МАГАЗИНА (Excel/1С):
  ──────────────────────────────────────
  Для каждой строки прайса:
  1. UPSERT global_products (ean) — если товара ещё нет
  2. UPSERT store_products (store_id, ean) — цена, полка, local_sku
  3. UPDATE store_products SET last_seen_at = NOW()
  4. INSERT product_matches (ean_exact, confidence=100)
  UNIQUE(store_id, ean) — повторный импорт не создаёт дублей

  АНАЛИТИКА МАГАЗИНА:
  ────────────────────
  SELECT * FROM store_top_scans    WHERE store_id = 'uuid'
  SELECT * FROM store_week_summary WHERE store_id = 'uuid'
  SELECT * FROM store_missing_unresolved WHERE store_id = 'uuid'

  КЛЮЧЕВЫЕ АРХИТЕКТУРНЫЕ РЕШЕНИЯ:
  ────────────────────────────────
  - UUID везде — готово к шардированию и репликации
  - global_products = source of truth (не products_cache!)
  - external_product_cache = сырьё, данные из него НЕ доверяем без верификации
  - missing_products — отдельная таблица (не VIEW) → можно ставить resolved=TRUE
  - halal_status TEXT (yes/no/unknown) — различаем "точно нет" и "неизвестно"
  - RLS: магазин видит ТОЛЬКО свои scan_events — конкурент не увидит чужое
  - UNIQUE(store_id, ean) в store_products — импорт можно гонять повторно
  - scan_count в external_product_cache — популярные EAN первыми на верификацию
  - Триггеры updated_at везде — не забываем обновлять вручную
*/
