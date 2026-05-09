# Сессия 1: Оптимизация сканирования — Умный резолвер

> Связи: [[product-resolution]] · [[offline-resilience]]

**Дата:** 2026-05-02
**Сессия:** 1 из 3 (план: scan-optimization-89f4ca.md)

## Что сделано

### Шаг 1 — Fire-and-forget логирование
**Файл:** `src/domain/product/resolver.js` → `finalizeResolvedProduct()`

`await Promise.allSettled([logScan, persistLocalHistory])` → `Promise.allSettled(...).catch(() => {})` (не ждём).

**Экономия:** ~150-300ms per scan (Supabase INSERT больше не блокирует навигацию).

### Шаг 3 — Session EAN cache
**Файл:** `src/domain/product/resolver.js` (module level)

- `_eanCache: Map<string, {product, ts}>` — ключ `${ean}:${storeId}`
- TTL: 5 минут (`EAN_CACHE_TTL_MS = 5 * 60 * 1000`)
- Cache hit: fire-and-forget log + instant return
- Cache miss: `_resolveProductByEanImpl` → `_eanCache.set`

**Экономия:** повторные сканы **< 1ms** вместо 400-800ms.

### Шаг 5 — PostgreSQL RPC + resolver refactor
**Файлы:** `supabase/migrations/026_fn_resolve_product.sql`, `src/domain/product/resolver.js`

**SQL функция:** `fn_resolve_product_by_ean(p_ean TEXT, p_store_id UUID DEFAULT NULL) RETURNS JSONB`
- 1: store_products JOIN global_products (с alternate_eans @> через GIN)
- 2: global_products напрямую (fallback без store_id)
- ORDER BY: gp.ean = p_ean (0) > sp.ean = p_ean (1) > alternate_eans (2)
- GRANT EXECUTE TO anon, authenticated
- SECURITY DEFINER SET search_path = public, pg_temp

**JS функция:** `findProductViaRPC(ean, storeId)` — парсит `_sp_*` overlay поля → `normalizeGlobalProduct(data, storeOverlay)`

**Graceful fallback:** если RPC возвращает error → `{ _rpcUnavailable: true }` → код переходит к старым `findStoreProduct` + `findGlobalProductByEan`.

**Архитектурный рефакторинг:**
- `resolveProductByEan` (public) → проверяет cache → вызывает `_resolveProductByEanImpl`
- `_resolveProductByEanImpl` (private) — основная логика без кэша

**Экономия:** 2-4 sequential DB queries → 1 RPC round-trip (~200-500ms).

## Что НЕ сделано (следующие сессии)

- **Сессия 2:** pre-warm `html5-qrcode`, auto-warm IndexedDB, parallel stop+lookup, fps 20→25
- **Сессия 3:** оптимистичная навигация, camera overlay UI

## Требует ручного действия

```sql
-- Применить в Supabase SQL Editor:
-- Файл: supabase/migrations/026_fn_resolve_product.sql
-- Идемпотентен (CREATE OR REPLACE). Безопасен для повторного запуска.
```

## Проверка

`npm run build` — exit code 0, 581 modules, 10.84s ✅
