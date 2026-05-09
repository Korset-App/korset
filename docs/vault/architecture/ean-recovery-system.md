# EAN Recovery System

> Дата: 2026-04-27 | Статус: Рабочий
> Связи: [[product-resolution]] · [[data-moat-pipeline-strategy]] · [[ean-recovery-rls-decision]] · [[retail-cabinet]] · [[2026-05-03-v1-unknown-ean-request]]

## Проблема

~73 продуктов имели fake EAN (arbuz_, kaspi_, korzinavdom_ префиксы) — несканируемые идентификаторы, назначенные парсерами вместо реальных штрихкодов. Без реальных EAN сканер в магазине не находит продукт → Fit-Check невозможен.

## Journey: 77.2% → 99.0%

| Stage | Active | Real EAN | Fake EAN | Coverage |
|-------|--------|----------|----------|----------|
| Start | 8153 | 6297 | 1852 | 77.2% |
| Resolver v2 (alternate_eans) | 7237 | 6921 | 316 | 95.6% |
| NPC re-harvest + cleanup | 7142 | 6984 | 154 | 97.8% |
| Resolver v3 + OFF + weight cleanup | 7104 | 7031 | 73 | 99.0% |

## Автоматизированные подходы (все исчерпаны)

1. **Resolver v2** (`scripts/resolve-alternate-eans.cjs`) — промотирует уникальные GTIN из alternate_eans, деактивирует дубли + мердж ингредиентов
2. **Resolver v3** (`scripts/resolve-v3.cjs`) — KZ-aware (200-299 range для KZ кодов), NPC name search для no-alt продуктов
3. **NPC API** (`scripts/final-ean-harvest.cjs`) — 3 раунда, 67 EAN найдено
4. **Open Food Facts** (`scripts/off-ean-harvest.cjs`, `scripts/off-broad-search.cjs`) — brand+name и keyword поиск, 39 EAN
5. **UPCitemdb** (`scripts/upc-db-search.cjs`) — 0 результатов (KZ-специфичные)

## EAN Recovery Screen

**Файл:** `src/screens/EanRecoveryScreen.jsx`
**Роут:** `/retail/:storeSlug/ean-recovery`
**Навигация:** 4-я вкладка в RetailBottomNav (оранжевый qr_code_scanner)

### Функционал:
- Список продуктов с fake EAN (arbuz_, korzinavdom_)
- **Сканер штрихкода** — оранжевая кнопка, открывает RetailScannerModal → EAN авто-вставляется
- **Карточка товара** — клик на название → ProductScreen в новой вкладке
- **Редактирование названия** — иконка ✏️ → инлайн-редактор
- **Удаление** — полное DELETE из global_products + store_products, с модалом подтверждения
- **Валидация EAN-13** — checksum проверка инлайн

## Serverless API

**Файл:** `api/ean-recovery.js`

### Проблема RLS:
Anon key НЕ может DELETE/UPDATE в global_products — Supabase возвращает `{data:null, error:null}` молча. Все write-операции идут через serverless с service_role key.

### Эндпоинт:
- `POST /api/ean-recovery` с JWT авторизацией
- `action: delete` — DELETE из store_products + global_products
- `action: update-ean` — UPDATE ean в global_products + store_products
- `action: update-name` — UPDATE name в global_products
- Верификация JWT через `supabase.auth.getUser(token)`

## Ключевые решения

- **Delete = полное удаление** (не deactivate) — пользователь явно запросил
- **Service_role key** обязателен для write-операций из-за RLS
- **NPC alternate_eans с 0200/2500 prefix** — НЕ верифицированы в NPC, внутренние/нерабочие коды
- **Весовые товары** (22 шт) деактивированы — нет штрихкода по определению
- **KZ EAN-13 коды** 200-299 range — РЕАЛЬНЫЕ (казахстанские префиксы), не restricted

## NPC API детали

- URL: `https://nationalcatalog.kz/gw/search/api/v1/search`
- Method: POST, заголовок `X-API-KEY`
- Body: `{query, page, size}`
- Response: flat `items[]`, каждый `{gtin, ntin, nameRu, attributes[]}`

## Критический контекст

- Store ID: `cebbe5fe-0512-4b24-96c9-3af7c948b3a4`, slug: `store-one`, name: "MARS"
- UNIQUE constraint на `global_products.ean` и `store_products(store_id, ean)`
- `classifyBarcode()` из `validate-ean.cjs` возвращает 'EAN-13'/'EAN-8' (НЕ 'gtin')
- EAN-13 restricted ranges: 020-029, 040-049
