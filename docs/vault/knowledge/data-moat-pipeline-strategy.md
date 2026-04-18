# Data Moat Pipeline — ФИНАЛЬНАЯ СТРАТЕГИЯ 2026-04-18

> Утверждённая стратегия наполнения БД Körset качественными данными

---

## ИТОГИ ТЕСТИРОВАНИЯ (20 шоколадных товаров КЗ рынка)

### Результаты по методам

| Метод | Hit rate | GTIN/EAN | Состав | КБЖУ | Халал | Цена | Фото | Язык | Стоимость |
|-------|----------|----------|--------|------|-------|------|------|------|-----------|
| **NPC Search API** | **20/20 (100%)** | 14/20 (70%) | ❌ | ❌ | ❌ | ❌ | ❌ | RU+KK | Бесплатно |
| **Arbuz.kz** | ~80%* | ✅ article_index | ✅✅ (RU) | ✅✅ | ✅✅ | ✅✅ | ✅✅ | RU+KK | Бесплатно |
| **USDA FoodData** | ~70% импортных | ✅ | ✅ (EN) | ✅✅ (14 нутр.) | ❌ | ❌ | ❌ | EN | Бесплатно |
| Kaspi HTML | 33% | ❌ | 33% (RU) | partial | ❌ | ✅ | ✅ | RU | Бесплатно |
| OFF | ~30% | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | Multi | Бесплатно |
| EAN-Search.org | Не тест. | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | — | 19 EUR/мес |
| Ozon | Заблокир. | — | — | — | — | — | — | — | — |

*Arbuz: article_index = EAN-13 для брендовых товаров, внутренний код для собственных

### КЛЮЧЕВАЯ НАХОДКА: Arbuz.kz

**Arbuz.kz имеет ПОЛНЫЕ данные на русском и казахском:**

Пример — Milka с цельным фундуком:
- **Состав:** "Сахар, фундук цельный обжаренный, масло какао, молоко сухое обезжиренное..."
- **КБЖУ:** 483 ккал, 3.8 белки, 24 жиры, 63 углеводы
- **Халал:** Явная метка "Халал"
- **Цена:** 1 585₸ / 1 110₸
- **Фото:** Есть
- **На казахском:** Автоперевод, доступен через `lang=kk_KK`

---

## ФИНАЛЬНАЯ СТРАТЕГИЯ: Enrichment Cascade

```
┌──────────────────────────────────────────────────────────────────┐
│                    KÖRSET DATA MOAT PIPELINE                      │
│                                                                    │
│  Вход: 685 товаров в global_products (52 с реальным EAN)           │
│                                                                    │
│  Шаг 0: EAN-13 валидация                                          │
│    • Формула контрольной суммы EAN-13                             │
│    • Фильтруем мусорные GTIN на входе                              │
│                                                                    │
│  Шаг 1: NPC Search API (ПРИОРИТЕТ #1 для EAN/name)               │
│    • POST https://nationalcatalog.kz/gw/search/api/v1/search      │
│    • Auth: X-API-KEY header                                       │
│    • Body: {query, page, size} (НЕ pageNumber/pageSize!)          │
│    • Фильтр: categoryId="1020" (еда) для сужения поиска           │
│    • → GTIN, NTIN, nameRu, nameKk, ОКТРУ, страна, производитель  │
│    • Покрытие: ~100% КЗ товаров, 70% с GTIN                      │
│    • NTIN: 100% (КЗ-специфичный код)                              │
│                                                                    │
│  Шаг 2: Arbuz.kz (ПРИОРИТЕТ #1 для состава/КБЖУ)                │
│    • Парсинг карточки товара по article_index (EAN) или по названию│
│    • → Состав (RU/KK), КБЖУ, Халал, цена, фото, бренд            │
│    • На казахском: через параметр lang=kk_KK                      │
│    • Покрытие: ~80% продуктовых товаров КЗ                        │
│    • ВНИМАНИЕ: состав на KK — автоперевод (может быть неточный)   │
│    • РЕШЕНИЕ: брать состав на RU (оригинал), KK — опционально      │
│                                                                    │
│  Шаг 3: USDA FoodData Central (FALLBACK для состава/КБЖУ)         │
│    • GET https://api.nal.usda.gov/fdc/v1/foods/search             │
│    • Auth: api_key параметр (бесплатно, 1000 req/hr)              │
│    • Через Vercel proxy /api/usda (network timeout из КЗ)         │
│    • → Состав (EN), КБЖУ (14 нутриентов), GTIN, бренд             │
│    • Покрытие: ~70% международных брендов                         │
│    • Состав на EN — нужен AI-перевод в RU для Fit-Check           │
│                                                                    │
│  Шаг 4: Kaspi HTML (дополнение)                                   │
│    • → Состав (RU) + цена для товаров не в Arbuz/USDA             │
│    • Покрытие: +33%                                                │
│                                                                    │
│  Шаг 5: OFF (дополнение для аллергенов)                            │
│    • → Аллергены, NutriScore, additives_tags                      │
│    • Покрытие: ~30%, нестабильный API (503)                       │
│                                                                    │
│  ИТОГО: GTIN 85%+ | Состав 80%+ | КБЖУ 70%+ | Халал 60%+        │
└──────────────────────────────────────────────────────────────────┘
```

---

## API СПЕЦИФИКАЦИИ

### 1. NPC Search API (Национальный каталог товаров)

```
Base URL: https://nationalcatalog.kz/gw
Auth: X-API-KEY: t5_R3gcpKlSkt4Xz86p7pxkiw-vHW6Cwqw4-7eP68KM

Search: POST /search/api/v1/search
Body: {"query": "Milka шоколад", "page": 1, "size": 10}
ВНИМАНИЕ: page/size (НЕ pageNumber/pageSize — даст 400!)

Facets: POST /search/api/v1/search/facets
Body: {"query": "Milka", "page": 1, "size": 0}

Dictionaries: GET /dictionary/api/v1/public/items/root?dictionaryCode=OKTRU
Public Attributes: GET /application/api/v1/public/attributes

Ответ search:
- pageInfo: {page, size, totalPages, totalSize}
- items[].id, nameRu, nameKk, nameEn, gtin, ntin, fullCategoryCode
- items[].categoryNameRuL1-L4 (иерархия категорий ОКТРУ)
- items[].attributes[] (страна, бренд, производитель, ТН ВЭД)

ОГРАНИЧЕНИЯ:
- Состав НЕТ в search API
- Детальная карточка (/application/api/v1/products/{id}) требует Bearer OAuth
- Portal API (/gwp/portal/api/v1/) требует Bearer OAuth
- 29711 результатов для "шоколад" — нужен categoryId фильтр
```

### 2. NPC OFD Integration API (другой шлюз)

```
Search: GET https://nct.gov.kz/api/integration/ofd/search_ofd/?q=...
Search by GTIN: GET https://nct.gov.kz/api/integration/ofd/search_ofd/?tin=...
Bulk: GET https://e-catalog.gov.kz/api/integration/ofd/ofd_spec/?from=...&limit=1000
Auth: JWT Bearer (требует отдельной регистрации)

ОГРАНИЧЕНИЯ:
- Только id, name_ru/kk, gtin, ntin_code, is_social, modified, measure
- Состава НЕТ
- ofd_spec = 87400 товаров (в основном лекарства, НЕ еда)
```

### 3. Arbuz.kz

```
Site: https://arbuz.kz
API: JS-rendered SPA, данные в SSR HTML (publication-products компоненты)
Product URL: https://arbuz.kz/ru/almaty/catalog/item/{id}-{slug}/
KK version: параметр lang=kk_KK в конфигурации

Consumer API Keys:
  Mobile: arbuz-kz.web.mobile / 20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj
  Desktop: arbuz-kz.web.desktop / M3KAMKD0esxMQUcIBBnYD8sl1LUS6OQr

Данные в карточке товара:
- article_index (штрихкод/EAN для брендовых товаров)
- name (название на RU или KK)
- brand_name
- manufacturer_country
- Состав (полный, на русском)
- КБЖУ (ккал, белки, жиры, углеводы)
- Халал (явная метка)
- Цена (в тенге)
- Фото
- Оценки/рейтинг

ОГРАНИЧЕНИЯ:
- Нет публичного API — нужен парсинг HTML
- article_index может быть внутренним кодом (7 цифр) вместо EAN-13
- Состав на KK — автоперевод, может быть неточным
- РЕШЕНИЕ: брать RU состав как основной, KK как опциональный
```

### 4. USDA FoodData Central

```
Base URL: https://api.nal.usda.gov/fdc/v1
Auth: api_key=UgZ6ZToetVuOHnovz92IrzVyYPRuswQE71hRQoNl (бесплатно, 1000 req/hr)

Search: GET /foods/search?query={query}&dataType=Branded&pageSize=5&api_key=KEY
By UPC: GET /foods/search?query={upc}&dataType=Branded&pageSize=1&api_key=KEY

Ответ:
- foods[].fdcId, gtinUpc, description, brandName, brandOwner
- foods[].ingredients (полный состав на ENGLISH)
- foods[].foodNutrients[] (14+ нутриентов: Protein, Fat, Carbs, Energy, Fiber, Sugars, Sodium, Iron, Calcium...)

ОГРАНИЧЕНИЯ:
- Состав на английском — нужен AI-перевод для RU
- Из КЗ сети — network timeout, нужен Vercel proxy /api/usda.js
- Покрывает ~70% международных брендов (не КЗ-производство)

Vercel proxy уже написан: api/usda.js
```

### 5. Open Food Facts

```
Base URL: https://world.openfoodfacts.org
Auth: не требуется

Search: GET /cgi/search.pl?search_terms={query}&json=1&page_size=50
By barcode: GET /api/v2/product/{barcode}

ОГРАНИЧЕНИЯ:
- API нестабилен (часто 503)
- Покрытие КЗ ~30%
- Но: лучшие данные по аллергенам и NutriScore
```

---

## ПРОБЛЕМА ФИЛЬТРАЦИИ NPC + РЕШЕНИЕ

**Проблема:** "Milka" → 1226 результатов (слишком много)

**Решение:** 3 метода фильтрации

| Метод | Как | Когда |
|-------|-----|-------|
| По GTIN | query="7622210544179" → 1 результат | Если GTIN уже известен |
| По категории | categoryId="1020-0011" (шоколад) → ~100 результатов | Если ищем по названию |
| По стране | producer_country="DE" → только немецкие | Дополнительный фильтр |

**Для пайплайна:**
- Товары с GTIN → поиск по GTIN → точный матч
- Товары без GTIN → поиск по name+brand + categoryId → ручная/авто-валидация

---

## РЕШЕНИЕ ПО КАЗАХСКОМУ ЯЗЫКУ

- Arbuz.kz: состав на KK — **автоперевод**, может быть неточный
- NPC: nameKk — **оригинал** (введён продавцом)
- **Решение:** Состав брать на **RU** (оригинал с упаковки), KK — опционально через AI-перевод если нужно
- nameRu/nameKk из NPC — оба оригинальные, брать оба

---

## RATE LIMITS — БЕЗОПАСНОСТЬ

| API | Лимит | Наш расход (685 товаров) | Безопасно? |
|-----|-------|--------------------------|-----------|
| NPC | Не указан | ~700 запросов × 350ms = ~4 мин | ✅ Да |
| Arbuz | Не указан | ~700 запросов × 500ms = ~6 мин | ✅ Да (с delay) |
| USDA | 1000 req/hr | ~500 запросов = ~30 мин | ✅ Да |
| OFF | Не указан (503 частый) | По GTIN только | ⚠️ Осторожно |

---

## ФАЙЛЫ ДЛЯ РЕАЛИЗАЦИИ (следующий чат)

### Скрипты (scripts/)
1. `npc-enrich.cjs` — NPC Search API enrichment (GTIN + NTIN + nameRu/KK)
2. `arbuz-enrich.cjs` — Arbuz.kz парсер (состав + КБЖУ + халал + цена + фото)
3. `usda-enrich.cjs` — USDA enrichment (состав EN + КБЖУ) через Vercel proxy
4. `validate-ean.cjs` — EAN-13 checksum валидация

### Vercel API (api/)
5. `api/usda.js` — ✅ УЖЕ НАПИСАН (USDA proxy)
6. `api/ean-search.js` — ✅ УЖЕ НАПИСАН (EAN-Search.org proxy)

### Миграции
7. Добавить колонки: `ntin`, `oktru_code`, `halal_certified`, `kbju` в global_products

---

## РЕШЕНИЯ ПРИНЯТЫЕ В ЭТОЙ СЕССИИ

1. **NPC — ПРИОРИТЕТ #1 для EAN** — 100% hit rate, бесплатно, RU+KK
2. **Arbuz.kz — ПРИОРИТЕТ #1 для состава** — полный состав на RU, КБЖУ, халал, цена
3. **USDA — FALLBACK для состава** — EN состав + 14 нутриентов для товаров не в Arbuz
4. **EAN-Search.org — НЕ НУЖЕН** — NPC покрывает EAN поиск лучше и бесплатно
5. **Ozon — НЕ ДОСТУПЕН** — заблокирован, не тратить время
6. **Состав на KK — автоперевод** — брать RU как основной
7. **EAN-13 валидация** — обязательная на входе (контрольная сумма)
8. **NPC фильтрация** — по categoryId (еда=1020) для сужения поиска
9. **Vercel proxy** — для USDA (network timeout из КЗ)
10. **Postman — НЕ НУЖЕН** — данные те же что через скрипты
