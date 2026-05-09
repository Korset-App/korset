# Сессия 2: Оптимизация сканирования — Прогрев и логика

> Связи: [[product-resolution]] · [[offline-resilience]]

**Дата:** 2026-05-02
**Сессия:** 2 из 3 (план: scan-optimization)

## Что сделано

### Шаг 4 — Pre-warm html5-qrcode

**Файл:** `src/screens/HomeScreen.jsx`

Добавлен `useEffect(() => { import('html5-qrcode').catch(() => {}) }, [])`.

Браузер начинает загрузку и парсинг `html5-qrcode.js` (~350KB) пока пользователь смотрит на HomeScreen. К моменту нажатия "Сканировать" чанк уже в кеше браузера → `await import('html5-qrcode')` в `startScanner` разрешается мгновенно.

**Экономия:** ~500-800ms первого открытия сканера.

### Шаг 6 — Auto-warm IndexedDB → online fast-path

**Файлы:** `src/domain/product/resolver.js`, `src/contexts/StoreContext.jsx`

**resolver.js** — новый экспорт:
```js
export function notifyCatalogWarmed(storeId) {
  _catalogCachedAt = Date.now()
  _catalogWarmedStoreId = storeId || null
}
```
Переменные модуля: `_catalogCachedAt: 0`, `_catalogWarmedStoreId: null`, `CATALOG_ONLINE_TTL_MS: 1 час`.

В `_resolveProductByEanImpl`: IndexedDB-хит используется не только offline, но и когда:
```js
const catalogFresh =
  _catalogWarmedStoreId === storeId &&
  Date.now() - _catalogCachedAt < CATALOG_ONLINE_TTL_MS
if (isOffline || catalogFresh) { return ... }
```

**StoreContext.jsx** — после `saveCatalogToIndexedDB(products, storeId)` вызывает `notifyCatalogWarmed(storeId)`.

**Поток:** StoreContext уже скачивал весь каталог в батчах 500 и сохранял в IndexedDB. Теперь resolver ЗНАЕТ когда это произошло и для какого магазина. Сканы до warm-up → RPC (1 запрос). После warm-up → IndexedDB (< 5ms). Смена магазина → storeId не совпадает → снова RPC до нового warm-up.

**Экономия:** после ~5-15 сек с открытия магазина все сканы < 5ms вместо 200-500ms.

### Шаг 2 — Параллельный stop+lookup

**Файл:** `src/screens/ScanScreen.jsx`

```js
// Было (последовательно):
await stopScanner()
const result = await lookupProduct(...)

// Стало (параллельно):
const [result] = await Promise.all([
  lookupProduct(...),
  stopScanner(),
])
```

`stopScanner` и `lookupProduct` полностью независимы. Остановка камеры (~50-150ms) теперь происходит одновременно с DB lookup.

**Экономия:** ~50-150ms per scan.

### Шаг 8 — FPS 20→25

**Файл:** `src/screens/ScanScreen.jsx`

`{ fps: 20 }` → `{ fps: 25 }` в конфиге `scanner.start()`.

Браузерные реализации BarcodeDetector API делают detect-запросы в соответствии с fps. 25 fps = детект каждые 40ms вместо 50ms. Ускоряет распознавание кода особенно при нестабильном удержании телефона.

## Примечания

- Migration 027 (`fn_get_store_catalog`) не требуется — StoreContext уже реализует пакетную загрузку.
- `HomeScreen.jsx` теперь импортирует `useEffect` из React.
- `StoreContext.jsx` импортирует `notifyCatalogWarmed` из `resolver.js` — не создаёт циклической зависимости.
- `npm run build` ✅ exit code 0, 581 modules, 10.37s

## Следующая Сессия 3 (UX)

- Оптимистичная навигация: `navigate()` сразу после `busyRef = true`, ProductScreen показывает skeleton пока product грузится
- Camera overlay UI: зелёный flash при успешном сканировании, рамка с анимацией
