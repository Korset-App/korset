# Итоговый отчёт по трансформации разделов «Витрина» и «Настройки» кабинета магазина Körset

**Дата выполнения:** 14 октября 2026 г.
**Ветка:** `main`
**Изолированная рабочая директория:** `C:\projects\korset\scratch\antigravity-storefront-settings-2026-10-14\`
**Инструменты верификации:** Локальный порт 5187, Vite 5.4.21, Playwright / Chromium 1.59.1, Node.js v24.11.1, ESLint, vitest/node:test runner.

---

## 1. Резюме трансформации

Разделы «Витрина» (`RetailStorefrontScreen`) и «Настройки» (`RetailSettingsScreen`) кабинета магазина Körset полностью переработаны и выведены на уровень мирового B2B SaaS (планка качества Linear / Stripe / Shopify):
1. **Декомпозиция монолитов:** Два раздутых монолитных файла (~2050 строк в сумме) разбиты на 10 чистых, изолированных компонентов с прозрачными зонами ответственности.
2. **Ликвидация технического долга:**
   - Устранены рассинхроны типов магазинов (`convenience` vs `other`). Создан единый источник правды (SSOT) в `src/domain/retail/storeSettings.js`.
   - Браузерные `alert()` заменены на инлайн-уведомления и статусы.
   - Подключен высококачественный диалог печати листа А4 для торгового зала (`RetailQrDialog`).
   - Расчет часов работы покупательской витрины переведен на физическое расписание (`parseStoreSchedule`), а статус платформы («Опубликован» / «Черновик») вынесен в отдельный бейдж.
3. **Безупречная отзывчивость (Responsive 320px–1440px+):**
   - Устранены все 12 горизонтальных переполнений DOM (*overflow*).
   - Предотвращено сжатие переключателей `<Toggle />` во flexbox-контейнерах.
   - На планшетах 1024px и мобильных 320px карточки бенто-сетки и вкладки режимов расписания перестраиваются без наложения и переполнения.
4. **Двуязычность и темы:** Полная поддержка RU и KZ, синхронная работа светлой и глубокой тёмной темы.

---

## 2. Архитектурная декомпозиция (Before & After)

| Экран / Модуль | До рефакторинга | После рефакторинга | Новые модули и зоны ответственности |
| :--- | :--- | :--- | :--- |
| **Витрина (`RetailStorefrontScreen.jsx`)** | 742 строки (монолит) | ~230 строк | • `StorefrontBrandingCard.jsx` (логотип, кроппер, тип, название)<br>• `StorefrontQrCard.jsx` (QR зала, прямая ссылка, вызов печати)<br>• `RetailQrDialog.jsx` (изолированный лист А4 с QR для кассы)<br>• `StoreLivePreviewCard.jsx` (честный расчет времени работы, ссылка на каталог) |
| **Настройки (`RetailSettingsScreen.jsx`)** | 1314 строк (монолит) | ~360 строк | • `SettingsBasicSection.jsx` (название, формат, слаг)<br>• `SettingsAddressSection.jsx` (фактический адрес, 2GIS-парсинг координат, SEO)<br>• `SettingsAiNotesSection.jsx` (контекст для AI-ассистента, счётчики слов/символов)<br>• `SettingsNotificationsSection.jsx` (пуши, отчеты, защищенные тогглы)<br>• `SettingsTeamSection.jsx` (команда, аватары `<ProfileAvatar />`, роли)<br>• `SettingsDangerSection.jsx` (публикация/снятие, защищенный сброс каталога) |
| **Единый источник типов (`storeSettings.js`)** | Разрозненные массивы | Централизовано | `STORE_TYPES`, `getStoreTypeLabel()`, безопасная нормализация `other` -> `convenience` |
| **Якорная навигация (`RetailSettingsAnchorNav.jsx`)** | Ошибка локализации | Исправлено | Заменен сломанный ключ `notificationsTitle` на `retail.settings.notifyTitle` |
| **Стили сетки (`RetailLayout.css`)** | Жесткая сетка 1024px | Адаптивно | Правило `@media (min-width: 1024px) and (max-width: 1240px)` со `span 12`, защита от переноса слова в таббаре (`keep-all`) |

---

## 3. Детальный список устраненных проблем

1. **Ложный статус «Открыто/Закрыто» в предпросмотре покупательской витрины:**
   - *Было:* Статус брался напрямую из булева флага `is_published`. Закрытый ночью магазин отображался как «Открыто», а черновик выводил пугающее «Закрыто».
   - *Стало:* Индикатор физической работы рассчитывается через `parseStoreSchedule(openingHours, temporaryClosure)` с учётом текущего времени и дня недели. Статус видимости на платформе вынесен в отдельный бейдж («Опубликован» / «Черновик (скрыт)»).
2. **Конфликт типов магазинов (`Store Type enum`):**
   - *Было:* Витрина сохраняла `'convenience'`, Настройки сохраняли `'other'`. При переходе между вкладками тип магазина слетал на дефолтный `minimarket`.
   - *Стало:* В `src/domain/retail/storeSettings.js` вынесен канонический список `STORE_TYPES`: `minimarket`, `supermarket`, `convenience`, `halal`, `specialty`. Добавлена функция `getStoreTypeLabel(type, t, lang)` и автоматическая миграция legacy `'other'`.
3. **Печать рекламных QR-материалов:**
   - *Было:* Кнопка «Печать А4» вызывала `window.print()` на всю страницу кабинета с сайдбаром и полями ввода.
   - *Стало:* Интегрирован готовый компонент `RetailQrDialog`, генерирующий чистый вертикальный лист формата А4 с крупным контрастным QR-кодом, логотипом Körset, адресом магазина и призывом для покупателей.
4. **Сломанный ключ перевода в якорном меню:**
   - *Было:* В оглавлении настроек отображался технический ключ `⚠️retail.settings.notificationsTitle`.
   - *Стало:* Подключен актуальный ключ словаря `retail.settings.notifyTitle` с поддержкой RU и KZ.
5. **Сжатие тумблеров `<Toggle />` во flexbox:**
   - *Было:* На экранах 320px и 390px длинный текст описания сжимал кнопку переключателя с 44px до 29px, из-за чего круглый бегунок вылезал за границы кнопки.
   - *Стало:* В `src/components/Toggle.jsx` добавлены `flexShrink: 0; minWidth: 44px;`, а в `SettingsNotificationsSection.jsx` текстовому блоку задан `minWidth: 0; flex: 1;`.
6. **Горизонтальные переполнения сетки на 1024px (планшет):**
   - *Было:* При ширине 1024px боковая панель и оглавление оставляли для 2-колоночной сетки всего ~193px на колонку, карточки контактов распирало.
   - *Стало:* Добавлено медиа-правило для диапазона 1024–1240px, раскладывающее бенто-карточки на всю ширину (`grid-column: span 12`), сохраняя удобную вертикальную навигацию по оглавлению.
7. **Адаптивность табов расписания на 320px:**
   - *Было:* Жесткая колонка `minmax(130px, 1fr)` выталкивала кнопки режимов работы на 4px за границу экрана.
   - *Стало:* Использована эластичная колонка `minmax(min(100%, 115px), 1fr)` с центрированием и мягким переносом строк.
8. **Разрыв слова «Подключени-е» в мобильном таббаре:**
   - *Было:* Браузер переносил одну букву «е» на новую строку.
   - *Стало:* Введено `overflow-wrap: normal; word-break: keep-all; white-space: nowrap;` для табов мобильной навигации.

---

## 4. Результаты инструментальной верификации

### 4.1. Автоматический тест матрицы (Playwright / Chromium на порту 5187)
Запуск: `node scratch/antigravity-storefront-settings-2026-10-14/verify.mjs`
- **Матрица экранов:** 1440×960 (desktop), 1024×768 (tablet), 390×844 (mobile), 320×640 (small mobile).
- **Языки и темы:** `RU / light`, `KZ / dark`.
- **Экраны:** Витрина (`/retail/audit/storefront?preview`), Настройки (`/retail/audit/settings?preview`).
- **Ошибки консоли браузера:** **0** (было 4, полностью устранены).
- **Горизонтальные переполнения (Overflow):** **0** (было 12, полностью устранены).
- **Ссылка публичной витрины:** `/s/audit` (валидна).

### 4.2. Линтер (ESLint)
Запуск: `npm run lint`
- **Результат:** 0 ошибок, 0 новых предупреждений (`[lint-budget] No new lint warnings or errors`).

### 4.3. Локализация (i18n check)
Запуск: `node scripts/check-i18n.mjs`
- **Проверено:** 13 пространств имён.
- **Missing in KZ:** 0.
- **Orphan in KZ:** 0.
- **Empty values:** 0.
- **Статус:** `✅ PASS: all KZ keys present`.

### 4.4. Модульные тесты (Vitest / Node Test Runner)
Запуск: `npm run test:unit`
- **Всего тестов:** 863.
- **Успешно:** 863.
- **Упало:** 0.
- **Статус:** `PASS` (время выполнения ~6.4 сек).

### 4.5. Сборка продакшн-бандла (Vite Build)
Запуск: `npm run build`
- **Результат:** `✓ built in 12.84s`.
- Сгенерирован PWA Service Worker (`dist/sw.js`).
- Чанки модулей `RetailStorefrontScreen` (43.75 kB) и `RetailSettingsScreen` (72.19 kB) оптимизированы.

---

## 5. Доказательные снимки экрана

Все скриншоты сохранены в папке:
`C:\projects\korset\scratch\antigravity-storefront-settings-2026-10-14\screenshots\`

### Матрица адаптивности:
- `storefront__desktop-1440__ru-light.png` — Витрина на десктопе 1440px (RU, светлая тема).
- `storefront__desktop-1440__kz-dark.png` — Витрина на десктопе 1440px (KZ, тёмная тема).
- `settings__desktop-1440__ru-light.png` — Настройки на десктопе 1440px (RU, светлая тема).
- `settings__desktop-1440__kz-dark.png` — Настройки на десктопе 1440px (KZ, тёмная тема).
- `storefront__tablet-1024__ru-light.png` — Витрина на планшете 1024px.
- `settings__tablet-1024__kz-dark.png` — Настройки на планшете 1024px с адаптированной сеткой.
- `storefront__mobile-390__ru-light.png` — Витрина на iPhone 390px.
- `settings__mobile-390__kz-dark.png` — Настройки на iPhone 390px.
- `storefront__mobile-320__ru-light.png` — Витрина на узком экране 320px (0 overflow).
- `settings__mobile-320__kz-dark.png` — Настройки на узком экране 320px (0 overflow).

### Адресные проверки:
- `targeted__storefront__long-name__1440px.png` и `390px.png` — Обработка сверхдлинных названий магазинов.
- `targeted__storefront__draft-state__390px.png` — Чёткое отображение статуса черновика без путаницы с часами работы.
- `targeted__storefront__qr-section.png` — Блок QR зала и интеграция печати.
- `targeted__settings__savebar-dirty.png` — Плавающий `RetailSaveBar` при несохраненных изменениях.
- `targeted__settings__danger-clear-modal.png` — Модальное окно подтверждения опасных операций.

---

## 6. Затронутые и созданные файлы

### Модифицированные файлы кодовой базы:
- `src/screens/RetailStorefrontScreen.jsx` — Декомпозиция монолита, интеграция модулей брендинга, QR и превью.
- `src/screens/RetailSettingsScreen.jsx` — Декомпозиция монолита, разбиение на 6 тематических секций.
- `src/domain/retail/storeSettings.js` — Централизованный SSOT для форматов торговых точек (`STORE_TYPES`).
- `src/components/retail/RetailSettingsAnchorNav.jsx` — Исправление ключа локализации.
- `src/components/retail/StoreLivePreviewCard.jsx` — Расчет физического расписания, разделение статуса платформы.
- `src/components/retail/StoreAmenitiesEditor.jsx` — Адаптивная верстка и предотвращение сжатия кнопок.
- `src/components/retail/StoreScheduleEditor.jsx` — Эластичная сетка режимов расписания для узких экранов.
- `src/components/Toggle.jsx` — Защита от сжатия во flexbox (`flexShrink: 0`).
- `src/layouts/RetailLayout.css` — Медиа-правила для планшетов 1024px и мобильных 320px.

### Созданные модули:
- `src/components/retail/storefront/StorefrontBrandingCard.jsx`
- `src/components/retail/storefront/StorefrontQrCard.jsx`
- `src/components/retail/settings/SettingsBasicSection.jsx`
- `src/components/retail/settings/SettingsAddressSection.jsx`
- `src/components/retail/settings/SettingsAiNotesSection.jsx`
- `src/components/retail/settings/SettingsNotificationsSection.jsx`
- `src/components/retail/settings/SettingsTeamSection.jsx`
- `src/components/retail/settings/SettingsDangerSection.jsx`
