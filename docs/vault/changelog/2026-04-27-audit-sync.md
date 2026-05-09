# Аудит и синхронизация документов — 2026-04-27

> Связи: [[assistant-access-and-architecture-governance]]

## Что проверено

Полный аудит кода vs документация. Найдены серьёзные несоответствия: многие фичи помечены как "не начато" или "пустой P0 блокер", но на самом деле полностью реализованы в коде.

## Найденные несоответствия

| В документах | Реальность в коде |
|--------------|-------------------|
| RetailImportScreen "пустой P0 блокер" | ✅ 445 строк — drag&drop, preview, bulk RPC, unknown EAN staging |
| Data Moat "score не используется" | ✅ `data_quality_score` + `source_confidence` в `normalizers.js` → `sourceMeta` |
| resolver.js "без TTL" | ✅ `ttl_expires_at` 30д в `external_product_cache` |
| CompareScreen "не сделан" | ✅ 481 строка — двухэтапный scan flow, multi-factor scoring, AI commentary |
| Fit-Check Yellow "нет LLM для Е-добавок" | ✅ AI fallback через `resolver.js` с маркировкой `aiEnriched` |
| Офлайн "не сделан" | ✅ 6 слоёв — IndexedDB, SW, resolver, OfflineContext, queue, SWR |

## Обновленные файлы

- `docs/ROADMAP_PILOT_V1.md` — отмечены ✅ выполненные задачи (вместо удаления)
- `docs/vault/plans/audit-full.md` — обновлены оценки: Data Moat 25→55, общая 50→65
- `docs/CONTEXT.md` — обновлены приоритеты P0-P2, добавлены CompareScreen и Data Moat каскад в выполненные

## Новые приоритеты (актуальные)

1. **ProductScreen.jsx рефакторинг** — монолит 1400+ строк, inline-компоненты, не использует готовые `src/components/`
2. **Data Moat UI** — `sourceConfidence` уже в данных, нужен confidence-бейдж в ProductScreen
3. **i18n ProductScreen** — хардкод "Альтернативы", "Спросить AI" без `useI18n`
4. **nameKz в ProductScreen** — CatalogScreen уже поддерживает, ProductScreen — НЕТ
