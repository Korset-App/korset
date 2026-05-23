# ICON MIGRATION STATUS — 2026-05-23

## CatalogScreen — replaced
| Icon | Material Symbol | Status |
|------|-----------------|--------|
| Поиск | `search` | ✅ Custom SVG |
| История | `history` | ✅ Custom SVG (from ScanScreen IconHistory) |
| Фильтр | `filter_list` | ✅ Outline + filled SVG |
| Сортировка | `sort`/dynamic | ✅ Custom SVGs |
| Стрелка вверх (дороже) | `arrow_upward` | ✅ Custom SVG |
| Стрелка вниз (дешевле) | `arrow_downward` | ✅ Custom SVG |
| Больше белка | `fitness_center` | ✅ Custom SVG |
| Меньше сахара | `cookie` | ✅ Nosugar DietIcon SVG |
| Вид списка | `view_list` | ✅ Outline + filled (dots bigger) SVG, rotated 180° |
| Вид сетки | `grid_view` | ✅ Outline + filled SVG |

## CatalogScreen — performance correction

2026-05-23 follow-up: icon migration initially regressed CatalogScreen performance by adding string/HTML icon rendering and unrelated history handling. Final correction uses pure JSX SVG constants only: no `dangerouslySetInnerHTML`, no `HtmlIcon`, no SVG strings in render.

Catalog performance root cause was broader than SVG rendering: the screen sorted the full store catalog even when the top-level category showcase was visible and the product list was not rendered. Sorting by Fit-Check called `checkProductFit()` inside the `Array.sort` comparator, causing repeated expensive checks (`N log N` comparator calls). Fix: return an empty list for top-level category showcase and precompute fit/nutrition sort keys once per product before sorting.

Also removed unrelated `window.history.pushState`/`popstate` category handling that was introduced during icon work and could cause accumulated navigation state.

## CatalogScreen — remaining Material Symbols
| Icon | Symbol | Reason |
|------|--------|--------|
| Очистить поиск | `close` | User said leave as-is |
| Шевроны раскрытия | `expand_more` (×2) | Not mentioned |
| Режим сравнения | `compare_arrows` | Not mentioned |
| Закрыть сравнение | `close` | Not mentioned |
| Вердикт-бейджи | `check_circle`, `cancel`, `error_outline`, `warning` | Not mentioned |
| Кнопка сравнения | `close`/`add`/`compare_arrows` | Not mentioned |
| Empty: загрузка поиска | `travel_explore` | Not mentioned |
| Empty: нет результатов | `search_off` | Not mentioned |
| Empty: категория пуста | `inventory_2` | Not mentioned |
| Назад (стрелка) | `arrow_back` | Not mentioned |
