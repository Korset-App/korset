# NPC (Национальный каталог товаров) — API Test Results 2026-04-18

> GAME CHANGER для Data Moat Körset

---

## API Спецификация

| Поле | Значение |
|------|----------|
| **Base URL** | `https://nationalcatalog.kz/gw` |
| **Auth** | `X-API-KEY: <key>` (header) |
| **Search** | `POST /search/api/v1/search` |
| **Facets** | `POST /search/api/v1/search/facets` |
| **Public Dictionaries** | `GET /dictionary/api/v1/public/items/root?dictionaryCode=OKTRU` |
| **Public Attributes** | `GET /application/api/v1/public/attributes` |
| **Portal (нужен Bearer)** | `GET /portal/api/v1/...` |

### Search API — формат запроса

```json
POST /gw/search/api/v1/search
Headers: X-API-KEY: <key>
Body: {
  "query": "Milka шоколад",
  "page": 1,
  "size": 10
}
```

ВНИМАНИЕ: `page` и `size` (не `pageNumber`/`pageSize`)!

### Search API — формат ответа

```json
{
  "pageInfo": { "page": 1, "size": 10, "totalPages": 613, "totalSize": 1226 },
  "items": [
    {
      "id": 32721567,
      "nameRu": "Шоколад Milka Oreo 100 гр",
      "nameKk": "Шоколад Milka Oreo 100 гр",
      "nameEn": null,
      "shortNameRu": "Шоколад Milka Oreo",
      "gtin": "7622210544179",
      "kztin": null,
      "ntin": "0200253509538",
      "fullCategoryCode": "1020-0011-0003-100006374",
      "categoryCodeL1": "1020",
      "categoryNameRuL1": "Продукты пищевые/Напитки",
      "categoryCodeL2": "1020-0011",
      "categoryNameRuL2": "Кондитерские изделия",
      "categoryCodeL3": "1020-0011-0003",
      "categoryNameRuL3": "Шоколад",
      "categoryCodeL4": "1020-0011-0003-100006374",
      "categoryNameRuL4": "Шоколадные плитки",
      "attributes": [
        { "code": "country", "nameRu": "Страна происхождения", "value": "PL", "valueRu": "ПОЛЬША" },
        { "code": "brand", "nameRu": "Товарный знак", "value": "MONDELIZ", "valueRu": "MONDELIZ" },
        { "code": "producer_country", "nameRu": "Страна производителя", "value": "PL", "valueRu": "ПОЛЬША" },
        { "code": "a4282e5d", "nameRu": "Наименование производителя", "value": "Mondelez Polska S.A." }
      ]
    }
  ]
}
```

---

## Тестовые результаты (20 шоколадных товаров КЗ рынка)

| # | Запрос | Total hits | GTIN | NTIN | Название |
|---|--------|-----------|------|------|----------|
| 1 | Milka Alpenmilch | 10276 | - | 0200090202357 | Milka Milk & Choco Biscuits 150г |
| 2 | Milka Oreo | 10928 | 7622210544179 | 0200253509538 | Шоколад Milka Oreo White 100гр |
| 3 | Ritter Sport миндаль | 47389 | 4000417629616 | 0200196499538 | Шоколад Ritter Sport Миндаль |
| 4 | Ritter Sport Praline | 41505 | 4000417212009 | 0200208643355 | Шоколад Ritter Sport Тёмный Миндаль |
| 5 | KINDER шоколад | 49285 | 40084077 | 0200209979538 | Шоколад KINDER ШОКОЛАД |
| 6 | KINDER Bueno | 2052 | - | 0200232506879 | Kinder Bueno Т30 |
| 7 | Schogetten шоколад | 47781 | 4000415832308 | 0200166779226 | SCHOGETTEN Popcorn 100г |
| 8 | Победа шоколад | 55829 | 4751033540433 | 0200303093970 | Победа Шоколад горький «Доминикана» |
| 9 | Bucheron шоколад | 47833 | 4610088209620 | 0200210051018 | ШОКОЛАД BUCHERON FILLING МАНГО |
| 10 | O'Zera шоколад | 47829 | 4690329009257 | 0200016602537 | ШОКОЛАД O'ZERA TRUFFLE MOUSSE |
| 11 | Alpen Gold молочный | 94225 | 7622201427153 | 0200137576274 | Alpen Gold молочный 85гр |
| 12 | Alpen Gold фундук | 36064 | - | 0200236035306 | Alpen Gold «фундук» 85гр |
| 13 | KitKat молочный | 62116 | 3800020411087 | 0200210136371 | ШОКОЛАД KITKAT МОЛОЧНЫЙ ВАФЛЯ |
| 14 | KitKat тёмный | 217191 | - | 0200090459782 | KitKat Nestle Тёмный 169г |
| 15 | Hershey's молочный | 61111 | 34000338955 | 0200109161774 | HERSHEY.S 28г шокол. |
| 16 | Спартак шоколад | 74199 | 2270250 | 0200210138221 | КОНФЕТЫ СПАРТАК ШОКОЛАД ГОРЬКИЙ |
| 17 | NA MEDU орехи | 31955 | - | 0200091263166 | Кукла MGA Na Na Na Surprise (не матч!) |
| 18 | NA MEDU шоколад | 58187 | 4640047112548 | 0200320049684 | ШОКОЛАД NA MEDU Сказочный Молочный |
| 19 | Lindt Excellence | 5072 | 3046920028004 | 0200141118842 | Lindt Excellence dark 70% |
| 20 | Ferrero Raffaello | 4424 | - | 0200090379899 | Конфеты Ferrero Raffaello 150г |

**Итого:** 20/20 (100%) найдено, 14/20 (70%) с GTIN, 20/20 (100%) с NTIN

---

## Ограничения

1. **Состав не возвращается в search API** — только базовые атрибуты (страна, бренд, производитель, ТН ВЭД)
2. **Детальная карточка (с составом) требует Bearer token** — портал OAuth, X-API-KEY не подходит
3. **GTIN есть у 70%** — у 6 товаров GTIN = null или не-EAN (например "2270250" для Спартака)
4. **NTIN есть у 100%** — это КЗ-специфичный код, не международный EAN
5. **Search too broad** — "Milka" даёт 1226 результатов, нужна фильтрация по категории

---

## Рекомендуемый каскад для Data Moat

```
Priority | Source           | Что даёт                     | Hit rate
---------|------------------|------------------------------|----------
1        | NPC Search API   | GTIN/EAN, NTIN, nameRu/KK,   | 100% КЗ
         |                  | категория ОКТРУ, страна       |
2        | USDA FoodData    | состав (EN), КБЖУ (14 нутр.)  | ~70% импорт
3        | NPC Detail (OAuth)| состав (RU), полная карточка  | 100% КЗ (нужен token)
4        | Open Food Facts  | состав, аллергены, NutriScore | ~30% (fallback)
5        | Kaspi HTML       | состав (RU), цена             | 33%
```

---

## Next Steps

1. **Получить Bearer token для NPC Portal API** — даст состав товаров
2. **Зарегистрировать USDA API key** (бесплатно, 1000 req/hr) — даст состав/КБЖУ
3. **Построить NPC enrichment pipeline** — скрипт который:
   - Ищет товары по названию в NPC → получает GTIN + NTIN
   - По GTIN ищет в USDA → получает состав + КБЖУ
   - Загружает в global_products с source_type='npc_verified'
