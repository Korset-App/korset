# Arbuz.kz — API v1 (2026-04-19, обновлено)

> Arbuz.kz имеет полностью открытый API v1 — ГЛАВНОЕ ОТКРЫТИЕ для Data Moat

---

## API v1 — ПОЛНОСТЬЮ РАБОЧИЙ

### Auth

```
POST https://arbuz.kz/api/v1/auth/token
Body: { "consumer": "arbuz-kz.web.mobile", "key": "20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj" }
Response: { "token": "eyJ..." }  — JWT, TTL ~10 минут
```

### Search (по названию)

```
GET https://arbuz.kz/api/v1/shop/search/products?where[name][c]=QUERY&limit=20
Headers: Authorization: Bearer <token>
Response: { items: [...], total: N }
```

Поля товара из search: id, articleIndex, brandName, name, producerCountry, uri, image

### Product Detail (состав, КБЖУ, халал)

```
GET https://arbuz.kz/api/v1/shop/product/{id}
Headers: Authorization: Bearer <token>
Response: полный объект товара
```

Ключевые поля detail:
- `composition` — состав (RU текст)
- `nutritional` — КБЖУ: `{ fats: "33", kcal: "546", carbs: "51", protein: "9,1" }` (белки с запятой!)
- `characteristics` — массив `{ name: "Халал" }` → халяльный
- `priceActual` — цена в тенге
- `images` — массив URL картинок

### Collections

```
GET https://arbuz.kz/api/v1/shop/publications-products/{collectionId}
```

---

## Consumer ключи

| Платформа | name | key |
|-----------|------|-----|
| Mobile | `arbuz-kz.web.mobile` | `20I2OMoyCQ9BGQH7TimHCbErGuEjhLfj` |
| Desktop | `arbuz-kz.web.desktop` | `M3KAMKD0esxMQUcIBBnYD8sl1LUS6OQr` |
| Terminal | `arbuz-kz.web.terminal` | `LYYzhkpYsWEYjDHGolTeuUtgYB1Y6oaA` (не работает для auth) |

---

## Ограничения

1. **Поиск по штрихкоду НЕ работает** — 400 на where[barcode][eq]=..., where[articleIndex][eq]=...
2. **Поиск только по названию** — работает отлично по бренду (Milka, Ritter Sport, Schogetten, etc.)
3. **Нормализация нужна** — Nestlé → nestle (accents), O'Zera → ozera (apostrophes)
4. **Белки с запятой** — `protein: "9,1"` → нужно заменить запятую на точку

---

## Результаты enrichment (прод, 190 товаров)

- 143/190 (75%) найдено на Arbuz
- 127 с составом, 124 с КБЖУ, 23 с халал
- 47 не найдены — нишевые бренды (Chokodelika, Chokocat, TRAPA, Crea, Reese's, Feastables, etc.)

---

## Старые подходы (НЕ ИСПОЛЬЗОВАТЬ)

- HTML scraping `/ru/almaty/?q=...` — 684KB, HTML-encoded, НЕТ состава на search
- API v2/v3 — 401 без ключа
- URL `/ru/almaty/catalog/item/{id}/` — 404

---

## Скрипт

`scripts/arbuz-enrich.cjs` — полностью переписан на API v1
