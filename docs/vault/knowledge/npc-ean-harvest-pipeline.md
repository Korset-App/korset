# NPC EAN Harvest Pipeline

> Домен: knowledge
> Дата: 2026-04-26
> Связи: [[data-moat-pipeline-strategy]] · [[ean-recovery-system]] · [[ean-lookup-methods-research]]

---

## Проблема

8153 продуктов в `global_products`, но только 16% (1320) имели реальные EAN.
Остальные — fake EAN (`arbuz_XXXX`, `kaspi_XXXX`, `korzinavdom_XXXX`), которые не работают при сканировании штрихкода.

## Решение: Combo NPC Search

### Эксперимент (`npc-match-experiment.cjs`)

Протестировал 6 методов поиска по NPC API на 30 продуктах:

| Метод | EAN/query | Применимость |
|-------|-----------|-------------|
| brand+name | 29.3 | Универсально |
| brand+core+weight | 30.7 | Только если есть вес (11/30) |
| brand-only | 24.1 | Ловит все варианты бренда |
| brand+3words | 18.5 | Хуже brand+name |
| name-no-brand | 12.3 | Много шума |
| brand+type | 15.8 | Ограничено |

**Вывод:** combo из brand+name + brand+core+weight (если есть вес) + brand-only = максимальный охват.

### Скрипт `npc-eans-harvest.cjs`

**Стратегия:**
1. Fetch продукты без реального EAN, но с брендом
2. Для каждого: 2-3 NPC API запроса
3. Собирает ВСЕ уникальные GTINs (международные) и NTINs (казахстанские)
4. Score ≥ 10 — порог качества
5. Лучший GTIN → `ean` (primary), остальные → `alternate_eans` массив
6. Duplicate EAN: если EAN уже занят другим продуктом → в alternate_eans, пробует следующий

**Параметры:**
- `--limit=N` — кол-во продуктов
- `--dry-run` — без записи в БД
- `--offset=N` — пропуск продуктов (для продолжения)

**Результаты по партиям:**

| Партия | Продуктов | Обновлено | Primary EAN | GTINs | NTINs | Alt EANs | Avg/продукт |
|--------|-----------|-----------|-------------|-------|-------|----------|-------------|
| 1 (200) | 200 | 197 | 193 | 4426 | 3738 | 7596 | 39.9 |
| 2 (200) | 200 | 197 | 193 | 4426 | 3433 | 7596 | 39.9 |
| 3 (500) | ~398 | ~395 | ~390 | ~8000 | ~6000 | ~14000 | ~39 |

**Общий прогресс:** 1320 → 2558 реальных EAN (+94% рост)

## Текущая статистика (2026-04-26)

- Total active: 8153
- Real EAN: 2558 (31%)
- Fake arbuz_: 1337
- Fake kaspi_: 91
- Fake korzinavdom_: 4167
- Need real EAN: 5595

## Сканер уже поддерживает alternate_eans

`resolver.js` использует `.contains('alternate_eans', [ean])` на строках 87 и 121.
ProductLookup, StoreContext, normalizers, offlineDB — все уже читают `alternate_eans`.

## Следующие шаги

1. Продолжить harvest: `node scripts/npc-eans-harvest.cjs --limit=2000`
2. Параллельно по 2000, не все сразу (контекст чата ограничен)
3. После продуктов с брендом — рассмотреть name-only поиск для без-бренда
4. После harvest — проверить процент покрытия сканирования

## Ключевые файлы

- `scripts/npc-eans-harvest.cjs` — главный harvest-скрипт (combo подход)
- `scripts/npc-match-experiment.cjs` — эксперимент с 6 методами поиска
- `scripts/count-eans.cjs` — быстрая статистика EAN
- `scripts/npc-enrich.cjs` — старый single-EAN enrichment (заменён harvest)
- `scripts/validate-ean.cjs` — классификация EAN (GTIN/NTIN/fake)
- `data/npc-experiment-*.json` — результаты эксперимента
