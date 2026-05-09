# R2 CDN — Архитектура хранения изображений

> Дата: 2026-04-19
> Связи: [[product-resolution]] · [[data-moat-pipeline-strategy]]

## Общая схема

```
БД global_products.image_url → https://cdn.korset.app/products/{EAN}/main.jpg
                                    ↓
                         Cloudflare R2 bucket (korset-images, EEUR)
                                    ↓
                         Custom domain cdn.korset.app (Proxied, R2 тип)
```

## Хранилище

- **Bucket:** `korset-images` в Cloudflare R2, регион Eastern Europe (EEUR)
- **Путь:** `products/{EAN-13}/main.jpg`
- **Custom domain:** `cdn.korset.app` (R2 тип записи, Proxied)
- **Public Dev URL:** `https://pub-9b3ec957c3a443299310832308bec67a.r2.dev` — **401 Unauthorized** (не нужен, кастомный домен работает)

## БД

- `image_url` — текущий URL (cdn.korset.app)
- `original_image_url` — исходный URL для отката (OFF, Arbuz, Kaspi)
- `r2_key` — путь в R2 (`products/{EAN}/main.jpg`)
- `image_source` — источник картинки (`openfoodfacts`, `arbuz`, `kaspi`)

## Утилиты

- `src/utils/imageUrl.js` — `getImageUrl()`, `getThumbUrl()`, `getPreviewUrl()`, `getFullUrl()`
- **ВАЖНО:** Cloudflare Image Transformations (`/cdn-cgi/image/...`) НЕ работают на R2 — нужен платный план. Сейчас функции просто возвращают URL как есть.
- Когда подключим Cloudflare Images — вернуть параметры width/format/quality в getImageUrl()

## Миграция

- **Скрипт:** `scripts/migrate-images-to-r2.mjs`
- **Результат:** 580/620 загружено, 40 пропущено (локальные плейсхолдеры, недоступные URL)
- **Утилита:** `scripts/utils/r2-upload.cjs` — общая загрузка в R2
- **Arbuz-enrich обновлён** — автоматически загружает картинки в R2 при обогащении

## Интеграция

- `StoreContext.jsx` → `getImageUrl(gp.image_url)`
- `normalizers.js` → `getImageUrl(row.image_url)` (global + cache)
- `RetailProductsScreen.jsx` → `getImageUrl()` в displayImage и img src
- `RetailDashboardScreen.jsx` → `getImageUrl()` для ProductRow и MissedRow
