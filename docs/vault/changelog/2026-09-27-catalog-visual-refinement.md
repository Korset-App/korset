# 2026-09-27 — Каталог: карточки, шапка и загрузка иллюстраций

## Изменения

- Мозаика сохранена, узкая колонка расширена: соотношение 3:2 вместо 2:1.
  Текст и изображение занимают отдельные строки, подписи без ограничения
  количества строк; изображение вписывается целиком. Два уровня типографики.
- Ограниченная спокойная палитра, отдельное смешивание поверхностей для
  светлой и тёмной тем. Убраны тяжёлые тени и декоративные слои карточек.
- Шапка: название, постоянная кнопка «Состав» с количеством настроек,
  пояснение, поиск и сканер. Пояснение сворачивается при прокрутке/фокусе
  поиска; кнопка состава остаётся доступна в категории и поиске.
- Переключатель вида: 100×48 пикселей (94×48 на узком экране), подвижная
  подложка, доступное состояние нажатия. Отступ панели фильтров 16 пикселей.
- Позиция мозаики сохраняется при возврате. Сетка/список восстанавливаются
  по первому действительно видимому товару, а не по области предварительной
  отрисовки. Длинные заголовки категорий переносятся.
- 18 локальных WebP (820416 байт) прогреваются и декодируются фоном на
  покупательских экранах, пачками по три с низким сетевым приоритетом.
  Повторный прогрев не повторяет загрузку; ошибки допускают последующую попытку.
  Экономия трафика ограничивает прогрев четырьмя иллюстрациями.
- Категории добавлены в предварительный кэш устанавливаемого приложения.
- Удалён ненужный отдельный проход оценки всего каталога ради убранного
  счётчика; алгоритмы оценки и сортировки не менялись.
- Старые правила карточек/шапки заменены отдельным CatalogScreen.css,
  без накопления конкурирующих переопределений в index.css.

## Проверки

- `npm run check:agent:full`: PASS — переводы, 697 модульных тестов,
  отсутствие новых замечаний линтера, сборка, сценарий работы без сети.
  После успешного офлайн-сценария зависло завершение тестового сервера Windows;
  завершён только его известный процесс, общий запуск затем завершился с кодом 0.
- Chrome и Edge: 48 сочетаний 320/360/390/430/768/1280 × RU/KZ × две темы.
  У всех 18 карточек измерено отсутствие пересечения текста/медиа,
  обрезания подписей и горизонтального переполнения.
- Дополнительно восемь сценариев: переход/возврат, поиск/очистка,
  сортировка, переключение вида, открытие/закрытие состава.
- Постоянные регрессионные проверки `tests/e2e/catalogLayout.spec.js`:
  10 успешных запусков в Chrome/Edge. После исправления восстановления
  видимого товара оба соответствующих сценария повторно успешны.
  Локальная конфигурация запуска: `scratch/catalog-playwright.config.mjs`.
- При увеличении корневого текста до 200% на ширине 320 пикселей:
  одна колонка, названия целиком, наложений нет.
- Фоновая загрузка: в изолированном браузере все 18 иллюстраций получены
  на главном экране до перехода в каталог.
- Программная прокрутка вниз/вверх за 100 кадров, Chrome с CPU ×4:
  p95 интервала кадров 16,8 мс, максимальный интервал 84,4 мс, длинных задач
  JavaScript не зафиксировано; класс шапки изменился ровно два раза.
  Это локальный синтетический замер, не гарантия частоты кадров на телефонах.
- Независимый обзор обнаружил восстановление по предварительно отрисованному
  индексу; исправлено и проверено. Других существенных замечаний не найдено.

## Артефакты и границы

Снимки и подробные результаты: `scratch/catalog-visual/` (локальные, не в Git).
Изолированные сценарии использовали уже сохранённые образцы из
`tests/fixtures/product-card-normalization-samples.json`, без изменения EAN.
На живом локальном экране наблюдалась ошибка загрузки актуального каталога;
данные и серверные процедуры в этой работе не изменялись. Доступность рабочей
витрины этими визуальными проверками не подтверждена.

Safari/WebKit, Firefox и физические мобильные устройства не проверялись.
Публикация и изменения рабочей базы не выполнялись.

## Follow-up visual corrections

- Enlarged the catalog heading; reduced the composition action while preserving its touch area. Reused the curated fact-check icon.
- Removed generic explanatory copy. Only actual selected preferences appear as actionable chips; collapsed content is inert.
- Solid light-theme header; retained the dark header treatment.
- Shared pastel category palette across themes, with distinct adjacent mint/blue and lilac/coral cards.
- Tea artwork bleeds to horizontal edges; ready-meal artwork starts at the top with its label below; healthy artwork is larger and aligned right.
- Verification: check:agent:ui PASS; 8 viewport/language/theme combinations and 4 interaction flows passed in Chrome. Configured preference opens the drawer, becomes inert on scroll, and leaves the composition action available. git diff --check passed.
- Follow-up screenshots: scratch/catalog-refinement/. No production changes.

## Header invitation and personalized state

- Renamed the header action to localized Smart filter and replaced the icon with a text-only pill.
- Restored the expanding header for unconfigured shoppers with an actionable invitation and curved arrow. Configured shoppers see two preference chips plus an overflow count.
- Added a memoized fit count scoped explicitly to loaded products; loading/error/empty states use a neutral product-card explanation instead of a fabricated total.
- Preserved scroll hysteresis, reduced-motion support and inert collapsed controls.
- Verification: check:agent:ui PASS; Chrome RU/KZ, light/dark, 320/390 widths and interaction flows PASS. Four configured preferences render two chips plus +2; drawer access and collapsed inert state PASS. Screenshots inspected for invitation and configured states. git diff --check PASS.

## Header spacing follow-up

- Moved the invitation arrow next to its copy.
- Moved the loaded-product fit count to the right of preference chips. Narrow headers show one chip plus overflow; wider headers show two. Both columns can shrink without overlapping.
- Started collapse inside the initial showcase padding (14px threshold, expansion at 2px), instead of waiting until 72px of cards had scrolled out. Header remains in normal layout flow.
- Kept bottom labeling exclusive to ready meals, where the artwork requires it.
- Verification: UI gate PASS; Chrome RU/KZ light/dark at 320/390 and four interaction flows PASS. Additional 320/390/768 row geometry, collapse at 15px without first-card clipping, and re-expansion PASS. Inspected configured screenshots. No production changes.

## Header spacing and drawer saving follow-up

- Adjusted invitation arrow spacing to a midpoint between the previous two layouts.
- Two preference chips plus overflow now fit beside the loaded-product count at ordinary 390px width; narrow 320px layout keeps one chip plus overflow.
- Added RU/KZ saving strings for the Fit-Check drawer and replaced its missing common.saving lookup. Audited all translation keys referenced by this drawer: none missing in either locale.
- Verification: UI gate PASS; header geometry at 320/390/768 PASS; Russian and Kazakh drawer apply flows emitted no missing-translation warnings. git diff --check PASS.

## Responsive arrow follow-up

Anchored the invitation arrow to the header's right edge, aligned with the smart-filter action. The invitation copy reserves space for it. Checked 320, 390, 430 and 480px: arrow tip stays horizontally inside the action, does not overlap text, and no horizontal overflow occurs.
