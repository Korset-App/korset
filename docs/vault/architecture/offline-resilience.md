# Офлайн-устойчивость Körset

> Домен: architecture / offline-resilience
> Дата: 2026-04-17
> Связи: [[audit-full]] · [[session-2026-04-17b]]

---

## Принцип

Онлайн-первый, офлайн-устойчивый. Кэшируем при входе в магазин. При потере сети — каталог из кэша, Fit-Check работает + метка "из кэша", scan_events в очереди.

---

## 6 слоёв офлайн-устойчивости

### Слой 0: App Shell (Workbox Precache)

- vite-plugin-pwa, стратегия injectManifest
- HTML/JS/CSS доступны офлайн (8 прекэш-записей, ~1223KB)
- src/sw.js — Service Worker с Workbox + Background Sync + push + fetch handler

### Слой 1: Каталог (IndexedDB)

- Библиотека: idb (IndexedDB wrapper)
- Объём: ВСЕ товары текущего магазина (~3000 штук, ~9MB)
- БЕЗ картинок в V1 (Supabase Storage 500MB лимит)
- Структура: catalog (key: ean, value: product object), store_meta (cache timestamp), pending_scans (FIFO queue)
- Файл: src/utils/offlineDB.js

### Слой 2: Резолвер (resolver.js)

- IndexedDB lookup в начале каскада разрешения товара
- Ранний выход при offline: если нет сети — сразу из IndexedDB
- pending scan при offline-сканировании (сохраняет событие для синхронизации)
- Файл: src/domain/product/resolver.js

### Слой 3: Очередь сканов (pending_scans)

- 100 FIFO в IndexedDB
- Background Sync API (reg.sync.register())
- Fallback: online event + periodic 30s check
- Файл: src/utils/localHistory.js (addPendingScan)

### Слой 4: Картинки

- НЕ кэшируются в V1
- Серые placeholder'ы при офлайн
- Будущее: WebP 80% сжатие (Фаза 7+)

### Слой 5: UI/SWR (OfflineContext + OfflineBanner)

- OfflineContext: isOnline, cacheAge, cacheStale, pendingCount, formatCacheAge
- OfflineBanner: жёлтая (офлайн) / оранжевая (кэш устарел) полоса
- ProductScreen: метка "Данные из кэша (Xч назад)" с i18n
- AIScreen: блокировка при offline с cloud_off иконкой
- ScanScreen: "Офлайн. Данных нет" при не найденном товаре офлайн
- CatalogScreen: IndexedDB fallback при offline
- Свежесть кэша: 7 дней, потом пометка "устарел"
- Файлы: src/contexts/OfflineContext.jsx, src/components/OfflineBanner.jsx

---

## Ключевые архитектурные решения

- Сценарий: онлайн → потом офлайн (кэшируем при входе в магазин, НЕ пытаемся работать без интернета с нуля)
- Объём кэша: ~9MB IndexedDB (приемлемо для мобильного)
- Картинки: НЕ в V1 (Supabase Storage 500MB лимит — обсудить отдельно)
- Fit-Check офлайн: работает на кэшированных данных
- Не найден офлайн: жёлтый "Офлайн, данных нет" (не красный — не ошибка)
- Background Sync: регистрируется при каждом addPendingScan
- SWR: stale-while-revalidate, кэш показывается мгновенно, обновление в фоне

---

## Ограничения V1

- Картинки не кэшируются (серые placeholder'ы)
- Нет сжатия фото (WebP 80% — будущее)
- Нет периодической фоновой синхронизации (Periodic Background Sync API — нестабилен)
- Нет предзагрузки каталогов нескольких магазинов (только текущий)
