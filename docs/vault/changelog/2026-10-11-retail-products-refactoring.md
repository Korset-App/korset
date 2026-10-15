# Кабинет магазина: модульный рефакторинг и редизайн раздела «Каталог»

Прежний монолитный экран `src/screens/RetailProductsScreen.jsx` (2502 строки) декомпозирован на чистую архитектуру компонентов с единой ответственностью. Создан обновлённый интерфейс десктопной таблицы (1440px) и компактных мобильных карточек (390px) в полном соответствии с дизайн-системой Körset (`--rc-*` токены) и требованиями управляющего магазином.

### 1. Архитектура и модули

- `src/hooks/useRetailProducts.js` — изолированная работа с данными (React Query infinite query, оптимистичные мутации цен и наличия, таймер инвалидации акций на границе `valid_until`, дебаунс поиска и сканер штрихкодов).
- `src/components/retail/products/RetailProductsToolbar.jsx` — адаптивная панель поиска и фильтров. На мобильном раскладывается в 2 строки (Поиск + Сканер, затем Категория + Переключатель вида). Содержит быстрые чипы-фильтры со счетчиками: «Все», «В наличии», «Мало», «Нет», «Касса (UMAG)», «Ручные», «Внимание» и кнопку сброса.
- `src/components/retail/products/RetailProductsTable.jsx` — десктопная CSS Grid таблица без горизонтального скролла с отображением штрихкода, источника данных, цен/скидок, статуса наличия и готовности Fit-Check (Халал, KZ/RU состав).
- `src/components/retail/products/RetailProductRowCompact.jsx` — мобильная карточка высокой плотности с 2 строками названия (без обрезки на 18 символах), моноширинным EAN бейджем, полочным адресом и понятным источником (POS vs Körset).
- `src/components/retail/products/RetailProductInspector.jsx` — единый инспектор товара (боковой drawer на десктопе, bottom sheet на смартфоне) с 3 вкладками: «Витрина магазина», «Учётная система (касса)» и «Паспорт Fit-Check». Для позиций из кассы явно заблокированы изменения и выведено пояснение, почему правки выполняются в 1С/кассе.
- Атомарные подкомпоненты: `StockBadge.jsx`, `PriceField.jsx`, `PromotionSection.jsx`, `StockToggle.jsx`, `ShoppingRecommendationToggle.jsx`, `productHelpers.js`, `GridCard.jsx`, `ProductCard.jsx`, `EditBottomSheet.jsx`, `ConfirmDeleteModal.jsx`.

### 2. Ключевые решения для управляющего магазином

1. **Мгновенный аудит ассортимента**: на одном экране видна цена, скидка, наличие, источник и паспортизация Fit-Check.
2. **Изоляция проблемных позиций**: чип-фильтр «Внимание» отфильтровывает товары без цены, без остатка или с неполными данными в 1 клик.
3. **Разграничение кассы и витрины**: позиции кассы помечены бейджем `🔒 Касса (UMAG)`, цены и остатки защищены от ручного расхождения. Ручные позиции (`Körset`) открыты для свободного редактирования.

### 3. Темы, локализация и верификация

- 100% поддержка тем (Light и Dark) через CSS-переменные `--rc-*`. Захардкоженные цвета отсутствуют.
- 100% паритет локализации RU и KZ через `useI18n` в `src/locales/{ru,kz}/retail.json`.
- Скриншоты сгенерированы в `scratch/external-retail-products-review/`:
  - `phase2-desktop-1440-table-ru-light.png`
  - `phase2-desktop-1440-table-kz-dark.png`
  - `phase2-desktop-1440-inspector-drawer.png`
  - `phase2-desktop-1440-filter-attention.png`
  - `phase2-mobile-390-compact-list-ru-light.png`
  - `phase2-mobile-390-compact-list-kz-dark.png`
  - `phase2-mobile-390-inspector-sheet.png`
- Все системные проверки пройдены: `npm run lint` (0 ошибок, 0 новых варнингов), `node scripts/check-i18n.mjs` (100% pass), `npm run test:unit` (863/863 pass), `npm run build` (чистый production-бандл).
- База данных, миграции, RLS и рабочий каталог Codex `scratch/pilot-readiness-2026-10-11/worktree` не затрагивались.
