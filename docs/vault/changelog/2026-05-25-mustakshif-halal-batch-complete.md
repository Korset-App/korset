# Mustakshif Halal Batch Complete

## Что сделано
- Проведён полный batch-чек 11 862 продуктов с `halal_status=unknown` через mustakshif.com
- Исправлен баг пагинации Supabase: `PAGE_SIZE=2000` превышал server `max-rows=1000`, из-за чего половина продуктов пропускалась. Исправлено: `PAGE_SIZE=1000`.
- Добавлена поддержка `--resume` с сохранением `checkedEans` в JSON для возобновления после прерывания.
- Вывод прогресса каждые 10 продуктов с timestamp для визуального контроля.
- Всего запущено 4 batch'а (из-за прерываний и бага пагинации).

## Результаты
- `yes`: 598 → **822** (+224, прирост +37.5%)
- `no`: 84 (без изменений — Mustakshif "no" игнорировались)
- `unknown`: 11 180 → **10 956** (−224)
- Покрытие: 5.7% → **7.6%**

## Изменения в скрипте

### `scripts/mustakshif-halal-check.cjs`
- `PAGE_SIZE`: 2000 → **1000** (Supabase max-rows)
- Добавлено: `--resume` flag, `loadProgress()`, `checkedEans[]` в progress файле
- Прогресс каждые 10 продуктов с timestamp
- `ORDER BY ean ASC` для детерминированной пагинации

## Решение
- **Mustakshif закрыт** как источник халал-данных для Körset.
- 92.4% unknown — принимать для V1.
- Единственный путь к >50% покрытия: партнёрство с HalalDamu или GS1 KZ.

## Файлы
- `scripts/mustakshif-halal-check.cjs` — основной скрипт чекера
- `data/mustakshif-progress.json` — файл прогресса
