# 📋 KÖRSET — CHANGELOG (Лог изменений)

> Сюда добавляется всё что было сделано в каждой сессии.
> Формат: `[Дата] — [Что сделано]`
> Последние изменения — **вверху**.

---

## Апрель 2026

### 2026-04-16 (Сессия 6 — Объединение планов и переход к разработке)

- Полностью заменен `TODO_V1.md` и `TODO.md` на объединенный и актуализированный `ROADMAP_PILOT_V1.md`.
- В новый роадмап включены договоренности по дизайну (Lens/Glassmorphism, Stories для главного экрана), производительности, AI и данные.
- Внесены задачи технического долга (Lazy Loading, Material Symbols, i18n.js) из старого TODO в новый роадмап.
- Список задач (Todo List) агента синхронизирован с новым роадмапом.

### 2026-04-15 (Сессия 5 — Фаза 2.4: Accordion-редактор)

**RetailProductsScreen (Управление каталогом):**

- Добавлен компонент `ShelfField` для редактирования расположения товара на полке (`shelf_zone`). Оснащён save-on-blur с визуальными состояниями: idle / saving / saved / error (как у поля цены).
- Добавлен `ReadonlyBlock` внутри аккордеона. Он отображает информацию из `global_products`: крупное фото товара, категорию, бренд, объём и состав (ingredients).
- Интегрирована плавная анимация раскрытия карточки товара через CSS Grid (`grid-template-rows: 1fr / 0fr`), что позволило отказаться от фиксированной `max-height`.
- Обновлён запрос `getStoreCatalogProducts` в `retailAnalytics.js` для подгрузки `ingredients_raw`, `ingredients_kz` и `quantity`.
- Добавлены новые ключи локализации (RU/KZ) в `i18n.js` для полей полки, категории, бренда и состава.
- База данных: проверена актуальная схема `KORSET_DB_SCHEMA_FULL.sql`, исправлена опечатка в определении таблицы `users` (было `мublic.users`). Поля `shelf_zone` и `shelf_position` уже присутствуют в `store_products`, дополнительных миграций не потребовалось.

### 2026-04-14 (Сессия 4 — Landing Entry + DevTools)

**RetailEntryScreen — вход в кабинет с лендинга:**
- Создан `RetailEntryScreen.jsx` — роут `/retail` без slug. Находит магазин по `owner_id`, редиректит на `/retail/:slug/dashboard`. Если не найден — экран с контактом.
- PILOT MODE: временно ищет первый активный магазин без проверки `owner_id` (RBAC отключён до привязки owner_id в БД).
- `RetailLayout.jsx` — RBAC закомментирован для пилота (TODO: включить после привязки owner_id).
- `App.jsx`: роут `/retail` добавлен; `/retail*` исключён из redirect на `setup-profile`.
- `HomeScreen.jsx`: кнопка "Кабинет" в top nav + B2B секция "Вы владелец магазина?" перед footer.

**Git / Deploy:**
- Remote обновлён на `github.com/Korset-App/korset` (репо перенесён в организацию).
- Репо сделан публичным для Vercel Hobby плана.
- `netlify.toml` создан (резервный деплой).

**DevTools настроены:**
- ESLint (`eslint.config.js`) — проверка `src/`, правила react-hooks.
- Prettier (`.prettierrc`) — единый стиль кода.
- Husky + lint-staged — автопроверка перед `git commit`.
- `@tanstack/react-query` установлен (готов к использованию в Фазе 1).
- Playwright (`playwright.config.js`, `tests/e2e/landing.spec.js`) — 4 базовых e2e теста.
- Скрипты: `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run test`.

**Workflows:**
- `.windsurf/workflows/fullstack-developer.md` — добавлен скилл.
- `.agent/workflows/cleanup.md` — наполнен реальными командами для очистки проекта.

### 2026-04-14 (Сессия 3 — Фаза 0: Фундамент данных)

**StoreContext → Supabase:**
- `StoreContext.jsx` полностью переписан: магазины теперь загружаются из таблицы `stores` в Supabase.
- Добавлен localStorage-кэш (`korset_store_data_<slug>`): первый визит — загрузка из Supabase, повторные — мгновенно из кэша + фоновое обновление.
- Добавлена поддержка `/retail/:storeSlug/` путей в `getStoreSlugFromPath` (раньше retail routes не давали `currentStore`).
- Поле `stores.code` нормализуется в `slug` для обратной совместимости.
- Новый `isStoreLoading` в контексте.

**RBAC в RetailLayout:**
- Реализована реальная проверка `stores.owner_id === user.id`. До этого — любой авторизованный мог зайти в чужой кабинет.
- Добавлен `NoAccessScreen` (инлайн) с объяснением и контактом поддержки.
- Обработка `isStoreLoading` — показывает spinner пока загружаются auth + store data.
- Замена SVG-иконки → Material Symbols `storefront`.

**storeCatalog.js:**
- Добавлена `getStoreCatalogProductsFromDB(storeId)` — async Supabase JOIN (`store_products` + `global_products`). Используется Phase 2 (RetailProducts).
- Старые sync функции сохранены для обратной совместимости (scan flow, resolver.js).

**Экраны — миграция:**
- `StoresScreen.jsx`: `getStores()` → Supabase query с loader и empty state.
- `StorePublicScreen.jsx`: `getStoreBySlug()` → `useStore()` (StoreContext уже загрузил данные из Supabase).
- `HomeScreen.jsx`: fallback для `logo` → если `logo_url` нет в DB, показывает первую букву названия.

**Удалены мусорные файлы:**
- `src/scr.md` (34 KB)
- `src/screens/screens.md` (335 KB)
- `src/components/.venv/` (Python virtual env)

**Осталось перед Phase 1:**
- ⚠️ Запустить SQL-патч в Supabase (RLS fix + seed store) — без этого app не читает store data.
- `src/data/products.json` и `storeInventories.js` — будут удалены в Phase 2 (после миграции scan flow).

### 2026-04-14 (Сессия 2 — Планирование)
- Проведён полный аудит проекта. Выявлены критические проблемы: магазины захардкожены в `src/data/stores.js` (не из Supabase), RBAC в RetailLayout — заглушка, `products.json` не удалён, `web-push` в клиентских зависимостях, нет code splitting.
- Согласован полный Roadmap рефакторинга Retail Cabinet (Фазы 0–5) совместно с Google Antigravity.
- Обновлены все контекстные документы:
  - `TODO_V1.md` — полная перезапись с поэтапным планом (Фазы 0–5 с детальными задачами).
  - `KORSET_ULTIMATE.md` — Раздел 17 заменён на полный архитектурный roadmap Retail Cabinet.
  - `KORSET_ULTIMATE_CONTEXT.md` — обновлены секции «Что уже работает» и «Текущий фокус» с таблицей фаз.

### 2026-04-14 (Сессия 1 — Стабилизация + Retail skeleton)
- Исправлена утечка памяти `AudioContext` в `ScanScreen.jsx` путём глобализации и очистки контекста при размонтировании компонента.
- Устранён технический долг по дизайну: кастомные SVG-иконки в `ScanScreen.jsx` заменены на стандартные компоненты из `Material Symbols` (`image`, `cameraswitch`, `flashlight_on/off`).
- Полный аудит контекстных файлов проекта. Удалены дубликаты.
- Переписан `KORSET_ULTIMATE.md` — устранён дубль раздела 15, унифицировано форматирование, добавлены: QR-стратегия, структура Retail Cabinet v1, этапы запуска A→E, ключевые файлы, шрифты.
- Переписан `KORSET_ULTIMATE_CONTEXT.md` — стал компактным «быстрым контекстом» для старта сессий.
- Создан `CHANGELOG.md` (этот файл) — лог всех изменений по сессиям.
- Добавлена полная структура проекта в `KORSET_ULTIMATE_CONTEXT.md`.
- **Фаза 1 (Юридическая безопасность)**: 
  - Добавлен экран Privacy Policy (`/privacy-policy`) на RU/KZ языках.
  - В процесс Onboarding добавлен юридический дисклеймер об ИИ.
  - Ссылки на политику вшиты в `AuthScreen` и `ProfileScreen`.
  - Устранён технический дубль роутов в `App.jsx`, добавлена защита от сбоев интернета в `ProfileContext`. Вынесены хардкод строки локализации в `i18n.js`.
- **Фаза 2 (Синхронизация профилей)**:
  - Создана утилита `profileSync.js` для smart-объединения массивов предпочтений и аллергенов.
  - Внедрён полноэкранный `SyncResolveModal` — экран разрешения конфликтов данных при первом логине гостя в готовый аккаунт (Объединить / Аккаунт / Устройство).
  - Написана двусторонняя синхронизация `syncScanHistoryWithCloud` в `localHistory.js` с прозрачным переносом гостевой истории новому юзеру.
  - Исправлен креш-баг с зависанием белого экрана при загрузке за счет глобального обертывания приложения в `ErrorBoundary` (`App.jsx`).
- **Фаза 3 (Retail Cabinet v1)**:
  - Создана защищённая B2B зона с роутингом `/retail/:storeSlug/*` (Auth Guard через `RetailLayout`).
  - Добавлена кастомная навигация `RetailBottomNav` в "строгих" синих тонах, отличающаяся от клиентской.
  - Разработан экран `RetailDashboardScreen` со сводной статистикой сканирований и топом продуктов.
  - Управление товарами (`RetailProductsScreen`) реализовано через мобильно-оптимизированный "Accordion Card" интерфейс вместо таблиц (поиск, крупный price-input, ios-like toggle switch для наличия).
  - Созданы новые экраны `RetailImportScreen` (руководство по загрузке БД) и `RetailSettingsScreen` (управление точкой, переключатели уведомлений B2B).

### До 2026-04-14 (история из прошлых сессий)
- Реализована инфраструктура Push-уведомлений (Service Worker, VAPID, API endpoints, SQL-схема).
- Реализован Admin Rapid-Scan (`/admin/rapid-scan`, RBAC: role=admin).
- Реализован Edit Mode профиля (`?mode=edit` — смена имени/фото без сброса аллергенов).
- Реализован компонент `ProfileAvatar` (AI-пресеты на CSS/SVG + загруженные фото из Supabase Storage).
- Настроен Landing Page в стиле Glassmorphism (Bottom Nav скрыт, якорь `b2b-section`, иконки Material Symbols).
- Подключена Supabase Auth (Google OAuth).
- Реализован 2-шаговый Onboarding (Имя → Аватар).
- Настроен роутинг через `react-router-dom` v6 с парадигмой `/s/:storeSlug/`.
- Реализован AIScreen (чат с ИИ, контекст привязан к продукту).
- Реализован рабочий сканер штрихкодов (`html5-qrcode`).
- Переход на 100% Supabase (удалён products.json и локальные моки).
- Настроена мультиязычность RU/KZ через `useI18n` / `src/utils/i18n.js`.

---

## Шаблон добавления записи

```
### ГГГГ-ММ-ДД
- [Экран/Файл]: [Что именно сделано и почему]
- [Экран/Файл]: [Что именно сделано и почему]
```
