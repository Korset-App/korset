# Сессия 2026-04-18 — Результаты

## Главная тема
Наполнение БД `global_products` качественными продуктами из Kaspi для KZ рынка.

## Ключевые результаты

### HTML fallback — РАБОТАЕТ
- Kaspi mobile API даёт характеристики, **НО НИКОГДА "Состав"** — это ограничение API
- HTML-страница товара содержит полный список характеристик в `specifications-list` DOM
- Парсер: regex `<span class="specifications-list__spec-term-text">` + `<dd class="specifications-list__spec-definition">`
- Результат: состав вырос с 8% → 33% (3x улучшение)

### Kaspi API формат изменился
- Старый: `:category:03831:availableInZones:750000000` → **404**
- Новый: `q=шоколад&categoryIds=03831` — работает
- Цены: `unitPrice` из listing API — **100% покрытие**
- Фильтрация подарочных товаров: бренды "Без бренда", "CLUBNIKA.KZ" и т.д. + ключевые слова "букет", "корзина", "бокс"

### EAN enrichment v2
- upcitemdb.com: поиск по названию, но нет RU-брендов
- OFF v2 API: верификация EAN по `/api/v2/product/{ean}`
- DuckDuckGo: **блокирует после ~100 запросов**
- Результат: 52 из 130 товаров получили EAN (40%), 31 верифицированы
- Проблема: разные вкусы одного бренда получают один EAN (неточный матч)

### OFF-мусор удалён
- 1503 global_products без name/brand/image — удалены
- 1441 store_products-ссылок — удалены
- Осталось: 685 чистых товаров

### БД состояние (конец сессии)
- global_products: **685**
- store_products (DARA): **685**
- С составом (ingredients_raw): **495 (72%)**
- С ценами: **269 (100%)**
- С реальным EAN: **52** (остальные kaspi_XXXXXX)

### DB schema особенности (уроки)
- `source_confidence`: **smallint** (целое!), не float
- `is_verified`: **NOT NULL boolean**
- `store_products` колонки: ean, local_name, stock_status, shelf_zone, is_active (НЕ is_available!)
- Миграция 006 (`alternate_eans`): **ВЫПОЛНЕНА** пользователем

### Исследования: лучшие методы (ещё не тестировались)
- **USDA FoodData Central** — бесплатный API, даёт EAN + состав + 14 нутриентов для ~70% импортных брендов
- **EAN-Search.org** — 19 EUR/мес, единственный с name→EAN поиском, есть триал
- **Ozon Seller API** — barcode поле, но нужен seller-аккаунт
- **1С/CommerceML импорт** — 80%+ КЗ магазинов используют 1С со всеми EAN
- **Честный ЗНАК** — российская система маркировки, может иметь API
- **OCR на фото Kaspi** — обратная сторона упаковки, ~$0.03/фото

### Следующий шаг
Тестировать 3 метода на 20 товарах:
1. USDA FoodData Central (EAN + состав)
2. EAN-Search.org триал (name→EAN)
3. Ozon публичный поиск (EAN)
Сравнить, выбрать лучший, потом масштабировать.

### Структура файлов пайплайна
- `scripts/kaspi-download.cjs` — v3 с HTML fallback
- `scripts/parse-kaspi-html.cjs` — HTML-парсер (модуль)
- `scripts/kaspi-enrich-eans.cjs` — v1 (только наша БД)
- `scripts/kaspi-enrich-eans-v2.cjs` — v2 (upcitemdb + OFF + DDG)
- `scripts/kaspi-load-to-db.cjs` — загрузка в Supabase
- `data/kaspi/01_chocolate-bars_raw.json` — 269 товаров
- `data/kaspi/01_chocolate-bars_enriched.json` — 130 обогащённых
