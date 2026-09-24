# 2026-09-24 — Backlog-сессия: профиль-edit, строгий EAN на карточке товара, иконки фильтров, PWA-install

## 1. Скоуп

Четыре задачи из пользовательского backlog (домашний тест на /s/mars):

1. «Редактировать профиль» из аватар-меню → страница ошибки.
2. «Установить приложение» — доработка кнопки + реальная функциональность установки.
3. Умный фильтр — иконки к единому размеру/стилю.
4. Популярный товар → при загрузке мелькает чужой продукт (~1s), потом правильный.

Решения согласованы с владельцем: PWA-установка (не сторы), гибридный флоу
(нативный prompt когда доступен, иначе шторка-инструкция), полная унификация
включая вынос DietIcon из экрана в компоненты.

## 2. Диагнозы (важно для будущих сессий)

### «Редактировать профиль»
- Маршрут и URL корректны (`/s/:slug/profile/edit`, App.jsx:111). Причина не в роутинге.
- Дефект 1: `ProfileEditScreen` делал `navigate('/auth')` ВО ВРЕМЯ РЕНДЕРА при
  `user === null` — это происходит у гостей и у авторизованных, пока сессия
  восстанавливается (cold start). Нарушение контракта React Router.
- Дефект 2: кнопка в аватар-меню Home не была скрыта для гостей (на ProfileScreen скрыта).
- Дефект 3 (вероятный источник «error page» у авторизованных в проде): lazy-чанк
  экрана не грузится → ErrorBoundary. Recovery уже есть (`chunkRecovery.js` +
  `lazyWithRetry`), оставлен как есть.

### «Чужой продукт при открытии популярного товара»
- НЕ stale state (гипотеза владельца не подтвердилась): `ErrorBoundary key={pathname}`
  принудительно ремоунтит экраны, а `getProductScreenProduct` отбрасывает чужой fullProduct.
- Настоящий механизм: `findProductInCatalog(..., { allowAlternate: true })` при
  построении синхронного `baseProduct` матчит товар X, у которого загрязнённый
  `alternate_eans` содержит EAN целевого товара B → X рендерится мгновенно; полный
  fetch по точному EAN возвращает B → экран «исправляется». Корень данных — известная
  проблема EAN Integrity (146,805 алиасов, 81.4% critical), БД-часть НЕ трогалась.

## 3. Изменения

### Profile / ProfileEditScreen
- `ProfileEditScreen.jsx`: `loading`-гейт из useAuth → `<RouteLoader />`; для гостя
  `<Navigate to="/auth" replace />` (убран render-phase navigate).
- `HomeScreen.jsx`: кнопка edit обёрнута в `{user && ...}`; переход через
  `buildProfileEditPath()` вместо ручной конкатенации.

### ProductScreen — строгий EAN
- `ProductScreen.jsx:83`: `allowAlternate: false` — алиасные EAN резолвятся
  асинхронно через trusted resolver (RPC), вместо чужого каталог-товара показывается skeleton.
- `productScreenData.js` `getProductScreenBaseProduct`: каталог-продукт принимается
  только при точном совпадении `ean` — закрывает ту же дыру в ProductCompositionScreen.
- Новый `fetchSettledEmpty` state: skeleton от первого кадра (было одно-кадровое
  мигание empty-state «не найден»), при неудачном фетче — корректный empty-state
  вместо вечного skeleton; таймаут 8s тоже переводит в empty-state.
- Тесты: +2 кейса в `tests/unit/productScreenData.test.mjs` (алиас отбрасывается /
  точный матч остаётся). Всего 619/619 pass.

### Иконки — единая система
- `DietIcon` перенесён verbatim из `ProfileScreen.jsx` (245 строк) в
  `src/components/icons/DietIcon.jsx`; потребители переподключены: HomeScreen,
  CatalogProductCard, FitCheckDrawer, DietBadges, ProfileScreen. Инверсия слоёв
  (components → screens) устранена.
- Новые канонические иконки (viewBox 24, stroke 1.8, контракт `{size,color,className,style}`):
  `FilterIcon`/`FilterIconActive`, `SortFitIcon`, `SortCheapIcon`, `SortPriceyIcon`,
  `SortProteinIcon` (перерисован в stroke-гантели вместо filled-глифа viewBox 512),
  `SortSugarIcon`, `SlidersIcon`, `InstallIcon`.
- CatalogScreen: локальные SVG-константы удалены; один массив `CATALOG_SORT_OPTIONS`
  вместо двух дублирующихся; оба шрифтовых `expand_more` → `ChevronDownIcon`;
  compare-banner `close` → `CloseIcon`. Размер иконок фильтров — 16 везде.
- HomeScreen: локальная копия `PreferenceSlidersIcon` удалена → `SlidersIcon`.
- Мёртвые ключи `catalog.filters.*` удалены из ru/kz product.json.
- Добавлен отсутствовавший ключ `common.search` (ru «Поиск» / kz «Іздеу») — был
  консоль-ошибкой i18n на home (pre-existing).

### PWA Install (гибрид)
- Новый `src/components/home/InstallAppSheet.jsx/.css` — bottom sheet по паттерну
  FitCheckDrawer (framer-motion, portal, drag-to-close): платформозависимая
  инструкция (iOS Safari: Поделиться → На экран Домой; иначе шаги меню браузера),
  CTA нативного prompt при наличии `beforeinstallprompt`, benefits-чипы.
- Все тексты — переиспользованные осиротевшие ключи `home.install*` (RU+KZ были
  готовы со времён удалённого install-баннера).
- `HomeScreen.jsx`: если `installPrompt` есть — нативный диалог (как раньше),
  иначе шторка; `appinstalled` закрывает шторку; кнопка меню — `InstallIcon` +
  премиум-CTA стиль (gradient primary + glow, как fitcheck-drawer__submit).
- Манифест PWA не менялся (иконки 192/512 уже были).

## 4. Верификация
- `npm run check:agent:ui` — PASS. `npm run lint` — 0 errors (73 pre-existing warnings).
- `npm run test:unit` — 619/619. `node scripts/check-i18n.mjs` — PASS.
- `npm run build` — OK (PWA precache 145 entries).
- Playwright smoke (headless, /s/mars, guest): home renders; у гостя в меню нет
  edit-кнопки; install-кнопка открывает шторку с 2 шагами и 3 benefits;
  клик по популярному товару → URL /product/4870221500179, first paint —
  правильное название товара. До фикса `common.search` единственной console-ошибкой
  был i18n missing key.

## 5. Не сделано (осознанно)
- Чистка данных `alternate_eans` в БД (вариант C) — отдельная задача, требует
  согласования DB change. Экранная защита установлена.
- `cloud_off` / `search_off` глифы в empty-states каталога — вне скоупа фильтра.
- Рабочее дерево содержало несмерженные правки прошлых сессий (Compare/Scan и др.)
  — не тронуты, ничего не коммитилось.
