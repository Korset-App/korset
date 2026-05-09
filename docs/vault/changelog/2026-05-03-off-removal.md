# 2026-05-03 — OFF Removal + Background AI Enrichment

> Связи: [[data-moat-pipeline-strategy]] · [[product-composition-sources-research]]

## Что сделано

### 1. Open Food Facts полностью удалён из пользовательского потока

**Файл:** `src/domain/product/resolver.js`

- Удалены функции: `fetchFromOFFViaProxy`, `findCacheProduct` (из scan path), `saveToCache`
- Удалён импорт `normalizeOFFProduct` и `normalizeName`
- Убран параллельный блок `Promise.all([findCacheProduct, fetchFromOFFViaProxy])`
- Убраны fallback-блоки: external cache + online demo products

### 2. Новый каскад резолвера

```
session cache (_eanCache, TTL 5min)
  → IndexedDB (offlineDB)
    → local store catalog (warm path, < 5ms)
      → Supabase RPC fn_resolve_product_by_ean (migration 026)
        → fallback: findStoreProduct + findGlobalProductByEan
          → offline: IndexedDB fallback demo
            → [AI enrichment background]
              → "Не найден"
```

### 3. Background AI Enrichment

**Новые экспорты из resolver.js:**
- `enrichmentEvents: EventTarget` — шина событий для live-обновления карточки
- `maybeEnrichInBackground(product, cacheKey)` — запускается после Supabase hit, если `!ingredients && !description && !sourceMeta.aiEnriched`

**ProductScreen.jsx:**
- Добавлен `useEffect` слушатель `enrichmentEvents` по `ean`
- Карточка обновляется живо (без перезагрузки) когда AI enrichment завершается

### 4. ExternalProductScreen убран

- `App.jsx`: удалён lazy import + маршруты `/product/ext/:ean` и `/product/ext/:ean/ai`
- Файл `ExternalProductScreen.jsx` остался в репо (мёртвый код — Vite его не компилирует)

### 5. api/off.js → 410 Gone

Эндпоинт заменён на простой ответ 410 (endpoint removed).

## Сборка

`npm run build` — exit code 0, 0 ошибок.

## Commit

`2903229` — `refactor(scan): remove OFF, add background AI enrichment, drop ExternalProductScreen`
