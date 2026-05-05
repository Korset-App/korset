# KÖRSET — БЫСТРЫЙ КОНТЕКСТ

> Для ИИ-ассистента. Единственный файл для ручной загрузки в начале чата.
> Глубокая архитектура → `ARCHITECTURE.md`. Аудит → `docs/vault/plans/audit-full.md`. Правила → `AGENTS.md`.

---

## Что такое Körset

Store-context AI assistant (mobile-first PWA) для офлайн-магазинов Казахстана.
Сканирует штрихкод → Fit-Check (аллергии, Халал, диеты). B2B2C: платят магазины (~15 000 тг/мес SaaS).

**Стек:** React 18 + Vite + Supabase (PostgreSQL, Auth, Storage) + Vercel Serverless + OpenAI
**Код:** JavaScript (не TypeScript), Vanilla CSS (не Tailwind)
**Стиль:** Dark/Light Premium Glassmorphism, Advent Pro + Inter, SVG иконки (Material Symbols опционально)

---

## Маршруты

```
/                           → Лендинг
/s/:storeSlug               → Главный экран магазина
/s/:storeSlug/scan          → Сканер
/s/:storeSlug/catalog       → Каталог
/s/:storeSlug/product/:ean  → Карточка товара
/s/:storeSlug/history       → История
/s/:storeSlug/profile       → Профиль
/s/:storeSlug/profile/edit  → Редактирование профиля (аватар, баннер, ник)
/s/:storeSlug/account       → Личные данные (email, пароль, ID)
/retail/:storeSlug/...      → Retail Cabinet
```

---

## Что работает

- Supabase Auth (Google OAuth + Email+Пароль + Email OTP + WhatsApp OTP)
- Сканер штрихкодов, AIScreen (чат с ИИ + RAG)
- Сканер штрихкодов, AIScreen (чат с ИИ + RAG)
- Fit-Check (Red/Orange — детерминированный, Yellow — AI)
- Push-уведомления, История + Избранное, Smart Merge
- Retail Cabinet: Dashboard (тенге метрики), Products (inline edit, barcode search), Import (CSV/XLS/XLSX + unknown EAN staging), Settings (лого, контакты, QR), EAN Recovery (serverless API)
- CompareScreen: двухэтапный scan flow, multi-factor scoring, dynamic rows, AI commentary
- Офлайн: App Shell + IndexedDB каталог + очередь сканов + OfflineBanner
- RAG через Supabase pgvector
- RLS на 13 таблицах, JWT auth на API
- Светлая + тёмная тема (3 этапа завершены, semantic tokens на всём UI)
- Профиль: баннер + аватар + редактирование (ProfileEditScreen)
- Личные данные: AccountScreen — email, дата регистрации, смена пароля, выход, удаление аккаунта (с confirm modal), статус владельца магазина
- ProfileScreen: тема-зависимые цвета (name pill, guest banner), Retail Cabinet только для owner_id
- Footer: v1.0.0 + SVG флаг Казахстана (без эмодзи)
- Каталог: Virtuoso виртуализация + двухэтапная загрузка + light поля

---

## Железные правила (кратко)

0. **Vault Protocol:** НАЧАЛО чата → прочитай CONTEXT.md. КОНЕЦ чата → сохрани в Vault + embed. → `AGENTS.md`
1. Сначала анализ → потом код. Предложи план → получи апрув.
2. Не ломать работающее.
3. Смотри шире — проверяй связи (.gitignore, i18n, vault, контекст, импорты, side effects).
4. Экраны покупателя → только внутри `/s/:storeSlug/`.
5. Иконки: Качественные SVG для премиального вида. Material Symbols — опционально.
6. Аватары только `<ProfileAvatar />`.
7. **Тёмная + светлая тема — обе поддерживаются.** Только CSS-переменные, НЕ хардкодить цвета.
8. Новый текст → через `useI18n` (RU/KZ обязательно).
9. Оценивай через B2B: «Помогает ли это продать подписку?»
10. Не менять дизайн без разрешения владельца.
11. НЕ делать ручной деплой `vercel --prod`.

---

## АКТУАЛЬНЫЕ СТАТИСТИКИ БД (2026-05-02)

- **7008 active** global_products, **1203 inactive**
- **18 категорий** (было 227 хаотичных значений), 0 некорректных категорий
- **category_raw/subcategory_raw** — оригинальные значения сохранены для аудита
- **name_raw** — оригинальные имена сохранены перед нормализацией (миграция 025 ✅)
- **Колонка `ingredients`** — удалена, теперь `ingredients_raw` + `ingredients_kz`
- **Реальные EAN: 6980** (99.1%), **Fake EAN: 66** (0.9% — реальные продукты без штрихкода)
- **store_products active: 6867** (1 магазин MARS, 141 gp ещё не завезены)
- **EAN совпадение: 100%** (0 mismatches, 0 сирот)
- **Состав: ~88%** (6139 из 7008 имеют ingredients_raw)
- **R2 CDN: 99.96%** продуктов с картинками на cdn.korset.app
- **Названия нормализованы: 5352/7008** — sentence case, packaging suffixes removed, weight/% formatted
- **name_kz: 7008/7008** (100%) — 89% качество (65% со специфичными KZ буквами + 24% чистый KZ)
- **useLocalName** — все экраны показывают nameKz при lang=kz (был только CatalogScreen)
- **packaging_type: 195** (can 50, pouch 68, bottle_glass 38, bottle_plastic 35, tub 4, tetrapak 0)
- **fat_percent: 680** (min 0.5%, max 82.5%)

---

## МИГРАЦИИ

| # | Назначение | Статус |
|---|-----------|--------|
| 001-016 | Базовые (RLS, pgvector, indexes, RPC, profile, R2, data_quality) | ✅ все применены |
| 017-021 | Security hardening, allergen normalization, app_metadata, admin trigger | ✅ применены |
| 022 | idx_users_auth_id (RLS perf) + category normalization | ✅ применена |
| 023 | Fix SECURITY DEFINER на analytics views | ✅ применена |
| 024 | packaging_type + fat_percent + quality score (backfill: 964 updates) | ✅ применена |
| 025 | name_raw + price cleanup + batch_update_product_names RPC | ✅ применена |

---

## СКРИПТЫ PIPELINE (основные)

1. `scripts/arbuz-catalog-parser.cjs` — Arbuz-first bulk import (API+NPC+R2)
2. `scripts/arbuz-enrich.cjs` — обогащение через Arbuz
3. `scripts/npc-enrich.cjs` — NPC enrichment + `--fix-names`
4. `scripts/usda-enrich.cjs` — через Vercel proxy
5. `scripts/korzinavdom-parser.cjs` — Корзина дома
6. `scripts/npc-eans-harvest.cjs` — combo EAN harvest
7. `scripts/resolve-v3.cjs` — KZ-aware resolver + NPC name search
8. `scripts/resolve-unknown-eans.cjs` — серверный каскад (NPC → Arbuz → USDA → OFF)
9. `scripts/validate-ean.cjs`, `audit-catalog.cjs`, `add-category-prefix.cjs`
10. `scripts/migrate-images-to-r2.mjs`, `embed-vault.mjs`, `query-vault.mjs`
11. `scripts/translate-composition.cjs` — перевод состава через OpenAI
12. `scripts/backfill-quantity.mjs` — обновление quantityParsed в Supabase из name
13. `scripts/cleanup-nonfood.mjs` — деактивация non-food/pet_food, фикс garbage quantity
14. `scripts/sync-store-product-eans.mjs` — синхронизация fake→real EAN, деактивация дублей
15. `scripts/translate-names-kz.mjs` — массовый перевод name→name_kz через OpenAI (gpt-4o-mini, batch 10, ~$0.06)
16. `scripts/normalize-categories.mjs` — нормализация категорий (227→18)
17. `scripts/extract-attributes.mjs` — backfill упаковки/жирности/диет из названия (--dry-run/--live)
18. `scripts/normalize-names.mjs` — нормализация названий (sentence case, мусор, формат)
19. `src/domain/product/nameNormalizer.js` — центральная функция нормализации имён

---

## 🚨 АКТУАЛЬНЫЙ ПРИОРИТЕТ (2026-05-03)

**Аудит выполнен** (92 находки). **Этапы 1–4 ЗАКРЫТЫ ✅** (безопасность + DB + нормализация + KZ перевод).

### Статус этапов:

- ✅ **Этап 1** — Безопасность — ЗАКРЫТО
- ✅ **Этап 2** — DB фундамент — ЗАКРЫТО  
- ✅ **Этап 3** — Нормализация названий (5352/7008) — ЗАКРЫТО
- ✅ **Этап 4** — KZ перевод имён (90% качество) — ЗАКРЫТО
- ✅ **Этап 5** — i18n профессиональная миграция — ЗАВЕРШЕНО (0 lint errors, 4/4 e2e, 64 unit tests)
- 🟣 **Этап 6** — Рефакторинг монолитов (ProductScreen 1315 строк, ProfileScreen, HomeScreen)

### Monitoring (Production-ready)

- **Sentry** — фронтенд + бэкенд (`VITE_SENTRY_DSN` + `SENTRY_DSN` в Vercel)
- **Telegram alerts** — `api/sentry-webhook.js` + Sentry Internal Integration → мгновенные алерты
- **Rate limiting** — `/api/ai.js`, `/api/usda.js` (OFF removed)
- **Health check** — `/api/health`
- **Runbook** — `docs/vault/operations/monitoring-runbook.md`

**Общая оценка проекта:** ~82/100 (было ~80/100).

---

## ВЫПОЛНЕНО (ключевое)

- ✅ Light theme (3 этапа), EAN 99.1%, R2 CDN 99.96%, Состав 81%
- ✅ Retail: Dashboard(₸), Import(CSV/XLS), Products, Settings, EAN Recovery
- ✅ CompareScreen, Data Moat каскад, Quantity parser, Catalog Virtuoso+i18n+nameKz
- ✅ Security: RBAC, RLS, CVE-фиксы, fitCheck 35+ тестов, Sentry, Telegram alerts
- ✅ DB: 024 миграции, 18 категорий, packaging_type+fat_percent extraction, idx_users_auth_id
- ✅ Заморожено: визуал/Landing/Stories/биллинг — до первых продаж
- ✅ KZ перевод: 89% качество (было 72%), все экраны показывают nameKz при lang=kz
- ✅ i18n профессиональная миграция — 15 неймспейсов (добавлен `faq.json`), 0 dot-access
- ✅ Dead code cleanup: UnifiedProductScreen, ExternalProductScreen, мёртвые route-хелперы
- ✅ Багфиксы: CompareScreen ReferenceError, console.log/warn в продакшене
- ✅ FaqScreen, AccountScreen, HomeScreen — i18n gaps закрыты

---

## КЛЮЧЕВЫЕ ПРОБЛЕМЫ НАЗВАНИЙ (анализ 7046 продуктов) — ДЛЯ ЭТАПА 3

| Проблема | Кол-во | Пример |
|----------|--------|--------|
| ALL CAPS | 934 | `ПЕЧЕНЬЕ G&G С ПРОСЛОЙКОЙ ШОКОЛАДА 500ГР` |
| Мусорные суффиксы упаковки | 126 | `КНВРТ`, `ТБА`, `С/Б`, `Ж/Б`, `П/Б`, `СТБ` |
| Очень длинные (>80 символов) | 243 | Название + NPC-мусор + дублированный вес |
| Бренд в поле, но не в названии | 593 | brand=ABC но `ДЕСЕРТ АВС...` |
| Двойной вес | 93 | `670г Бут.ТП8 ... 670гр` |
| Жирность % в названии | 590 | `КЕФИР FRESH HOUSE 2,5% 300ГР` |

---

## КАТЕГОРИИ — РЕШЕНО (18 категорий + ~85 подкатегорий)

18 ключей: dairy_eggs, meat, deli, fish, water_beverages, tea_coffee, sweets, snacks, grocery, sauces_spices, bread, frozen, fruits_veg, baby_food, ready_meals, healthy, personal_care, household
Маппинг: `src/domain/product/categoryMap.js` → normalizeCategory()
Pipeline: arbuz-import, arbuz-catalog-parser, korzinavdom-parser — все используют normalizeCategory()

---

## АТРИБУТЫ ПРОДУКТОВ — EXTRACTION RULES

| Атрибут | Источник | Хранение | Ожидаемое кол-во |
|---------|----------|----------|-------------------|
| packaging_type | Суффиксы (КНВРТ, ТБА, Ж/Б, П/Б, ПЭТ, СТБ) | `packaging_type text` CHECK 6 типов | 195 applied |
| fat_percent | Цифра+`%` в названии + category hint | `fat_percent numeric(4,1)` | 680 applied |
| diet_tags | Ключевые слова | `diet_tags_json` (append) | ~94 applied |
| halal_status | HALAL/ХАЛЯЛЬ в названии | `halal_status` (upgrade unknown→yes) | ~10 |

6 типов упаковки: bottle_plastic, bottle_glass, can, tetrapak, pouch, tub
12 diet-тегов (после аудита): sugar_free, gluten_free, lactose_free, vegan, vegetarian, fitness, organic, kosher, diabetic, low_calorie, low_fat, enriched

---

## ТЕКУЩИЙ ФОКУС (2026-05-05)

### Сессия 10 — Auth Этап 1: Критические фиксы — ВЫПОЛНЕНО ✅

**9 критических фиксов AuthScreen:**

1. **1.1** OTP форма исчезала при 6 цифрах — `otp.join('').length < 6` → `Boolean(otpTarget)` (строка 380)
2. **1.3** i18n `{phone}` без `{` — исправлено в ru/auth.json + kz/auth.json
3. **2.1** Двойной редирект после регистрации — verifyOtp с signup → напрямую `/setup-profile`
4. **3.1** Autocomplete атрибуты — `email`, `current-password`/`new-password`, `one-time-code`, `tel` на все input
5. **3.3** OTP paste — onPaste handler на первый input, распределяет 6 цифр
6. **5.1** Resend OTP API — `supabase.auth.resend({ type: 'signup', email })` для signup, вместо signInWithOtp
7. **9.1** Flash формы при loading — spinner пока `authLoading === true`
8. **9.12** Loading spinner на AuthScreen — CSS animation spinner
9. **9.15** Google юзеры → skip setup-profile — App.jsx: auto `profile_setup_done: true` если есть `full_name + picture`

**Следующие этапы:** Этап 2 (14 UX фиксов), Этап 3 (13 polish фиксов)

**Верификация:** build OK, lint 0 errors, i18n OK

### Сессия 9 — CatalogScreen Bento Showcase Redesign — ВЫПОЛНЕНО ✅

**Технические детали:** `docs/vault/changelog/2026-05-05-catalog-showcase-redesign.md`

**Что сделано:**
- Верхний уровень `/s/:storeSlug/catalog` заменён с простой 2-колоночной сетки на адаптивную bento-витрину 18 категорий.
- Реальные category cutout-изображения из `public/catalog-raw/` сконвертированы в WebP и сохранены в `public/catalog-categories/` (`30–129 KB` на файл).
- Добавлен контракт витрины: `src/domain/product/catalogShowcase.js` хранит image/variant/tone/textTone для всех 18 нормализованных категорий.
- `CatalogScreen` теперь показывает все 18 категорий даже до завершения загрузки каталога; счётчики появляются только когда есть данные.
- Сохранена старая внутренняя логика: клик по категории переводит в список товаров этой категории, поиск/сортировка/подкатегории/Virtuoso не переписаны.
- Адаптивность: 6-column dense CSS Grid, `clamp()`, `grid-row/span`, hover только на hover-устройствах, `prefers-reduced-motion`, max-width остаётся в app-frame.
- Light/Dark: добавлен semantic token `--text-on-accent-dark`, карточки читаются в обеих темах.

**Проверка:**
- `node --test tests/unit/catalogShowcase.test.mjs` — PASS (2/2)
- `node scripts/check-i18n.mjs` — PASS (0 missing KZ)
- `npm run lint` — 0 errors, 50 existing warnings
- `npm run build` — PASS
- Playwright визуальная проверка: 360/393/430px, 18 карточек, 0 overlaps; проверены dark/light и клик внутрь категории.

### Сессия 8 — Landing Page V3 ПОЛНЫЙ РЕБИЛД — ЭТАПЫ 1-2 ВЫПОЛНЕНЫ ✅

**Полный план V3:** `docs/vault/plans/landing-v3-full-rebuild.md` (14 секций, Shopify-style)
**Технические детали этой сессии:** `docs/vault/changelog/2026-05-05-landing-v3-stages1-2.md`

**СТАТУС ЭТАПОВ ЛЕНДИНГА V3:**
| # | Секция | Статус |
|---|--------|--------|
| 0 | Дизайн-токены (`landing-tokens.css`) + animation framework | ✅ ГОТОВО |
| 1 | Header (fixed) + Hero (fullscreen video bg) | ✅ ГОТОВО |
| 2 | Demo-секция + CSS 3D phone mockup | ✅ ГОТОВО |
| 3 | How (3 шага с фото) + Fit-Check (3 мокапа) | ✅ ГОТОВО |
| 4 | Audience (4 карточки с фото) + Features (6 табов с мокапами) | ✅ ГОТОВО |
| 5 | Stats (большие цифры с bg-фото) + Video-demo + Retail | ✅ ГОТОВО |
| 6 | Pricing + FAQ (2 колонки/аккордеон) | ✅ ГОТОВО |
| 7 | Footer (лого+нав+локальный CTA) + polish pass (баг скролла) | ✅ ГОТОВО |


### КРИТИЧЕСКИ ВАЖНЫЕ АРХИТЕКТУРНЫЕ РЕШЕНИЯ V3:

#### 1. ESCAPE-МЕХАНИЗМ APP-FRAME (КЛЮЧЕВОЕ!)
`LandingScreen` рендерится внутри `HomeScreen → <div className="app-frame">` (App.jsx:85).
`.app-frame` в `index.css` имеет `max-width: 430px` и `overflow: hidden` — это УБИВАЕТ лендинг.

**Решение:** `useEffect` в `LandingScreen.jsx` на mount добавляет классы:
```js
document.querySelector('.app-frame').classList.add('app-frame--landing')
document.documentElement.classList.add('lp-html-active')
```
В `LandingScreen.css` класс `.app-frame--landing` отменяет все ограничения:
```css
.app-frame--landing {
  max-width: 100% !important;
  height: auto !important;
  overflow: visible !important;
  overflow-x: hidden !important;
  background: transparent !important;
  border: none !important;
  display: block !important;
}
```
На unmount — классы убираются. **НЕ трогать App.jsx или HomeScreen.jsx!**

#### 2. HEADER: position:fixed (НЕ sticky!)
`position: sticky` ломается внутри `overflow: hidden/clip` родителей.
Используем `position: fixed; top:0; left:0; right:0; z-index:60`.
Hero content имеет `padding-top: calc(var(--lp-header-h) + ...)`.

#### 3. ВИДЕО В HERO
`<video autoPlay muted loop playsInline poster={unsplashUrl}>` — тег video, не img.
Источник: `https://assets.mixkit.co/videos/preview/mixkit-shopping-at-the-supermarket-19406-large.mp4`
Poster (fallback): Unsplash `photo-1567449303183` (продуктовый магазин).

#### 4. CSS-ПЕРЕМЕННЫЕ
Все токены в `src/screens/landing/landing-tokens.css`.
`--lp-*` namespace изолирован от глобальных `--bg-app`, `--text` и пр.
НЕ хардкодить цвета кроме semitransparent rgba() для статус-цветов (ok/warn/bad).

### ЧТО СДЕЛАНО В ЭТОЙ СЕССИИ (Этапы 1-2):

**ЭТАП 1 — Header + Hero:**
- Fullscreen video hero (Shopify-style) — video абсолютно positioned как bg
- Header `position: fixed`, blur backdrop на scroll (`lp-header--scrolled`)
- Mobile hamburger + overlay menu
- Ротирующееся слово в заголовке (`HeroRotatingWord`)
- Pills, subtitle, 2 CTA кнопки, tagline с checkmarks
- Кнопки: `lp-btn--primary` = solid `var(--lp-brand)` БЕЗ gradient, `lp-btn--ghost` = white glass
- Заголовок: `font-weight: 600` (не 800 — тоньше, премиально)
- Scroll-cue анимация внизу hero

**ЭТАП 2 — Demo секция + Phone Mockup:**
- 2-колоночная секция (copy left, phone right на desktop)
- `DemoPhone` компонент — CSS 3D phone mockup:
  - `perspective(1100px) rotateY(-16deg) rotateX(5deg)` → hover de-tilts
  - Notch, status bar (9:41), app header с логотипом
  - Product card (🥛 + name + meta), зелёный status badge
  - 3 fit-check rows (аллергены/халал/КБЖУ), home indicator
  - Scan beam animation (violet→cyan линия, loop 2.4s)
  - Glow под телефоном, 2 floating orbit chips
- Все тексты через i18n (check-i18n PASS, 0 missing KZ)

### КАК ПРОДОЛЖИТЬ (следующий агент):

1. **Прочитай** `docs/CONTEXT.md` (этот файл) + `AGENTS.md`
2. **Vault RAG:** `node scripts/query-vault.mjs "landing v3 plan stages" --domain plans`
3. **Файлы:** `src/screens/LandingScreen.jsx` + `src/screens/LandingScreen.css` + `src/screens/landing/landing-tokens.css`
4. **СЛЕДУЮЩИЙ ШАГ:** Лендинг V3 полностью собран. Необходимо провести финальное тестирование на реальном устройстве, подготовить 3D Spline модели для замены CSS мокапов (если требуется) и собрать метрики производительности.

### ЧТО СДЕЛАНО В ЭТАПАХ 6 и 7 (2026-05-05):
**Bugfix:** Исправлен баг со скроллом на мобильных/десктопе. С `body` снимался `overflow: hidden` только по X, теперь для `.lp-html-active` применяется `overflow-y: auto !important`, возвращая нативный скролл.
**Pricing:** 3 тарифа (Basic, PRO, Enterprise) с выделением PRO (scale, box-shadow, z-index).
**FAQ:** Аккордеон с плавной CSS-анимацией через `grid-template-rows: 0fr -> 1fr` и вращением шеврона.
**Footer:** Премиальный черный футер (`#05050A`), две колонки ссылок, копирайт и логотип.
Плейсхолдер Этапов 6-7 успешно удален.

### ЧТО СДЕЛАНО В ЭТАПЕ 4 (2026-05-05):
**ЭТАП 4а — Audience:** 4 photo card grid, Unsplash, hover lift, `border-radius` + overlay gradient
**ЭТАП 4б — Features:** 6 табов (ARIA tablist/tabpanel/role=tab), переключаемый панель, 6 CSS мокапов: FitCheck/КБЖУ/Альтернативы/Сравнение/AI/QR
**Верификация:** build OK, check-i18n PASS, lint 0 errors

### ЧТО СДЕЛАНО В ЭТАПЕ 3 (2026-05-05):

**ЭТАП 3а — How (Как работает):**
- Убран `lp-stage-placeholder`, добавлена секция `#how` с 3 шагами Linear/Shopify-style
- Чередование layout: шаг 1 (фото слева), шаг 2 (фото справа), шаг 3 (CSS FitCheck mockup слева)
- Unsplash фото: person с телефоном у полки, barcode крупный план
- Numbered badges `01` `02` `03` — фиолетовый circular badge (Linear style)
- Step 3: CSS mini-mockup результата Körset (header, зелёная карточка «Подходит», 3 row аллерген/халал/КБЖУ)
- Reveal анимации: `lp-reveal--right` / `lp-reveal--left` с задержками
- Mobile-first: stack на мобильном, grid 46/54 на tablet+
- Чередование через `direction: rtl` на `lp-how__step--photo-right` (без лишних grid-переопределений)

**ЭТАП 3б — Fit-Check (Результат скана):**
- 3 glassmorphism карточки: `lp-fit__card--good` (зелёный), `--warn` (жёлтый), `--bad` (красный)
- Фоновое фото полки супермаркета (Unsplash) — blur + overlay
- Каждая карточка: ambient glow слева, SVG иконка, заголовок цвета тона, текст из i18n, пример продукта (молоко/шоколад/хлеб)
- `border-left: 3px` акцент цвета тона
- Hover: translateY(-4px) + цветной box-shadow glow
- Footer: «Не подошёл? Альтернативы» + disclaimer ⚠
- Grid: 1 col mobile → 2 col tablet → 3 col desktop

**Новые компоненты в JSX:** `collectObjArr`, `FitIcon`, `FitExampleProduct`, `AlternativesIcon`
**Верификация:** build OK, check-i18n PASS, lint 0 errors

### Сессия 6 — Landing Page Redesign V1 — ВЫПОЛНЕНО ✅

(Сессия 6 CSS-редизайн заменён сессией 7 — полный v2 overhaul)

### Сессия 5 — Code Quality & i18n Gaps — ВЫПОЛНЕНО ✅

**Удалено (мёртвый код):**
- `src/screens/UnifiedProductScreen.jsx` (548 строк) — не в роутере
- `src/screens/ExternalProductScreen.jsx` (625 строк) — OFF эпоха
- `buildRetailLoginPath()`, `buildSoundSettingsPath()`, `buildProductPath(..., true)` — мёртвые хелперы
- Ветка `isExternal` в AIScreen.jsx — недостижима

**Исправлено (баги):**
- CompareScreen.jsx:242 — **ReferenceError** (useLocalName до объявления productA)

**i18n доделано:**
- FaqScreen.jsx → `faq.json` (RU+KZ), 10 QA
- AccountScreen.jsx → убраны 20+ мёртвых `|| '...'` fallback'ов
- HomeScreen.jsx → 4 лендинг-строки в `home.json` + KZ
- ErrorBoundary.jsx → i18n-fallback'и

**Code quality (рутинная чистка):**
- 22 lint warnings устранены (71 → 49), 0 errors
- Убраны неиспользуемые импорты в 15 файлах:
  SpecsGrid, nameNormalizer, normalizers, resolver, AboutScreen, AccountScreen, AuthScreen,
  CatalogScreen, ProfileScreen, QRPrintScreen, HistoryScreen, SoundSettingsScreen,
  TermsScreen, imageUrl, soundSettings
- `catch (err)` → `catch (_err)` где err не использовался
- `imageUrl(url, options)` → `imageUrl(url)` — options был неиспользуемым опционалом
- StoreContext: `rememberStore`/`clearRememberedStore` → useCallback, убран лишний deps
- sw.js: убран неиспользуемый global event
- Двойные пустые строки почищены в AboutScreen, SoundSettingsScreen, TermsScreen, nameNormalizer

---

## HANDOFF NOTES

Если ты — следующий ИИ, начинающий новый чат:

1. **Прочитай `docs/CONTEXT.md`** — этот файл, текущий фокус.
2. **Прочитай `AGENTS.md`** — железные правила проекта.
3. **Сделай Vault RAG-запрос** для специфичной задачи: `vault-query("запрос")`
4. **OnboardingScreen удалён** — полностью убран (экран, локали, i18n, ProfileScreen-пункт)
   - Далее по приоритету: AuthScreen consentNotice i18n, BottomSheet компонент
   - Data Moat Confidence бейджи, RetailScannerModal i18n
   - БД-фиксы (UNIQUE, CASCADE, GIN), партицирование scan_events

### AI BEST-FIT (2026-05-03)

### V1 PILOT SCOPE DECISION (2026-05-03)

- V1 must stay narrow and shippable for a near pilot. Do not add 100-point product quality scoring, public 5-star ratings, or general feedback signals before launch.
- ProductScreen should stay clean: Fit-Check, product facts, alternatives, scan outcome. Do not clutter it with source badges, trust scores, or social rating blocks.
- CompareScreen exists at `/s/:storeSlug/product/:ean/compare/:ean2` (`src/screens/CompareScreen.jsx`). Keep existing relative comparison only; do not expand it into a product-quality score for V1.
- Unknown EAN V1 flow: if scan is unresolved, show a general not-found state. Mention that alcohol and tobacco are unsupported, but do not claim the item is alcohol unless category is known. If it is a normal grocery product, user can tap "Request product check".
- Unknown EAN queue means unresolved scans are saved as data-improvement tasks: EAN, store, timestamp, optional user/context. This improves real pilot coverage without inventing AI answers for unknown products.
- Store-facing V1 metrics should be business-simple: products synced/imported, scans, not-found scans, top requested unknown EANs. Do not make "products with ingredients" the store owner's problem; Körset owns card quality.
- IMPLEMENTED 2026-05-03: V1 unknown EAN request slice. `ProductScreen` not-found state now shows unsupported alcohol/tobacco wording and a "Request product check" action for valid EAN + store id. Logic lives in `src/domain/product/unknownEanRequest.js`, tests in `tests/unit/unknownEanRequest.test.mjs`. After the i18n migration landed, the copy was moved into `src/locales/{ru,kz}/product.json` under `product.unknownEan.*`; domain helper remains copy-free.
- POST-I18N ADAPTATION 2026-05-03: Verified the new i18n architecture (`src/i18n/*`, flat locale JSON, RU fallback, Intl format helpers, `check-i18n`). Fixed safe migration seams: `CompareScreen` rows now include `lang` in `useMemo` deps, `ThemeModeToggle` receives `t` explicitly, and Retail Products shelf placeholder comes from the translation props. Verification: unknown EAN test passed, i18n unit tests passed via direct Node runs, `check-i18n` passed, `npm run build` passed, `npm run lint` passed with warnings only.
- SCANSCREEN REDESIGN PREP 2026-05-03: User provided a light-theme ScanScreen visual reference and SVG icons. First safe step completed before redesign: `src/screens/ScanScreen.jsx` now has inline SVG components for gallery, torch on/off, compare active mirror state, history placeholder, and camera-switch filled state. No layout/scanner behavior redesign yet. Build passed; lint passed with warnings only.
- SCANSCREEN REDESIGN IMPLEMENTED 2026-05-03: `ScanScreen` is now a full-screen premium glass scanner UI driven by `src/screens/ScanScreen.css`, with live camera background, adaptive scan frame/line, SVG action dock, manual EAN input, recent scans bottom sheet, and V1 compare mode limited to 2 products. Compare first scan pins product in an in-scanner tray; second scan shows CTA before navigating to CompareScreen. Compare help sheet is shown once via `localStorage` key `korset_compare_scan_hint_seen`. Camera reliability improved for older devices: dynamic qrbox, lower fps, multiple camera constraint fallbacks, stale-start guard via `startSeqRef`, and browser test confirmed one video stream. ScanScreen z-index now sits above BottomNav; camera host does not intercept pointer events. Verification: `npm run build` passed, `npm run lint` passed with warnings only, `node scripts/check-i18n.mjs` passed, Playwright fake-camera smoke check passed for video, compare hint, and recent sheet.
- SCANSCREEN POLISH 2026-05-03: Manual EAN bar now matches the mockup more closely: empty state is input + recent/history only; submit arrow appears only after digits are entered. Added non-permission camera failure recovery overlay with Retry + Gallery, using `scan.cameraErrorBody`. RU title changed from "Сканировать" to "Сканирование". Re-verified with build, lint, i18n, and Playwright fake-camera screenshot/interaction checks.
- SCANSCREEN REAL-DEVICE FIXES 2026-05-03: After user tested on phone, fixed scan-line/frame and overlay issues. Removed extra horizontal line from scan frame (`.scan-frame::before` gone). Scanner line is now white glass with lightweight glow/tail and travels only within frame height. BottomNav must remain visible on ScanScreen: `.scan-screen` z-index is below BottomNav, and scanner dock is lifted above nav via `--scan-nav-space`. Compare hint and recent sheets are now opaque/solid, shorter, and positioned above nav; compare copy reduced to two steps. Camera switch icon uses a transient filled center state on click. KZ scan copy corrected: `scan.recentScans` = "Жақында сканерленгендер", `scan.manualInputPlaceholder` = "Штрих-кодты қолмен теру". Verification: check-i18n passed, Playwright fake-camera confirmed nav visible, no frame before-line, white scan-line, one video stream, short compare sheet, KZ recent/manual text, build passed, lint 0 errors.
- SCANSCREEN MINIMAL LINE POLISH 2026-05-03: User asked to remove the strong blur around the moving scanner line. `src/screens/ScanScreen.css` now keeps a white premium scan line but reduces glow to a small shadow and replaces the large blurred tail with a short subtle CSS-only trail for weaker phones. Verification: build passed, check-i18n passed, lint passed with warnings only.
- SCANSCREEN FRAME/CAMERA TOGGLE POLISH 2026-05-04: Raised the central scan frame slightly (`top: 46% -> 43%`, compact screens `42% -> 39%`) and moved the frame hint with it. Camera switch icon fill is no longer a short press flash; it now stays filled while a non-primary camera index is active and clears when returning to the first camera. Verification: build passed, lint passed with warnings only.
- SCANSCREEN CAMERA PERMISSION + MANUAL EAN UX 2026-05-04: Permission-denied state now explains that camera access was not granted, that it is safe and used only for barcode scanning, and offers Retry + Gallery fallbacks. Manual EAN input now keeps raw digits only, limits to 13 digits, displays grouped digits for readability, and shows a short helper/counter via RU/KZ i18n. Verification: build passed, check-i18n passed, lint passed with warnings only.
- DEMO REMOVAL + CLEANUP 2026-05-03 (3 commits: 8961791, c732f00, ea9298b):
  Demo products fully removed. storeCatalog.js: 157→20 lines (4 stubs). normalizers.js: OFF+demo functions removed.
  resolver.js: clean — session cache → IndexedDB → Supabase RPC → AI enrich bg → "not found".
  AIScreen: fixed TDZ crash (useLocalName called before product) + product now passed via location.state from ProductScreen.
  ScanScreen.css placeholder created (import existed, file missing → build fail).
  Known P1 backlog: AlternativesScreen broken (getAnyKnownProductByRef → null) — needs rewrite using StoreContext.catalogProducts.

- Лучшее применение Codex в Körset — не косметические UI-правки, а системные зоны с большим мультипликатором: Data Moat, pipeline обогащения, DB/RLS, внимательный рефакторинг монолитов.
- Самая сильная точка пользы: превращать разрозненную логику в надёжные потоки, инварианты, проверяемые скрипты и точечные архитектурные улучшения.
- Если нужен максимум ROI от следующей сессии с Codex: 1) Data Moat / retail import / unknown EAN cascade, 2) ProductScreen refactoring, 3) DB integrity/perf hardening после аудита.

### CATALOGSCREEN REFINEMENT 2026-05-05

- Catalog top-level bento showcase refined after visual review: explicit `grid-template-areas` replaced auto-dense placement, so the card order follows the Figma-inspired merchandising priority and no longer ends with lonely single-card rows.
- Product/category counts are removed from the top-level showcase UI; category cards now focus on image + readable title.
- Header treatment is closer to ProfileScreen: `Каталог` on the left, store name on the right (`Mars` from `/s/mars/...` fallback).
- Image crop/scale tuned for water, tea/coffee, grocery, bread, frozen, and household categories.
- Light theme strengthened with more visible borders/shadows for pale cards; dark theme remains the primary premium look.
- Category click now has a short exit animation before opening the product list.
- Verification after refinement: unit showcase test passed, i18n check passed, lint passed with existing warnings only, production build passed, Playwright visual smoke on 360/393/430 widths found 18 cards and 0 overlaps.

### CATALOGSCREEN GEOMETRY POLISH 2026-05-05

- Restored the showcase proportions closer to the Figma reference after user review: tea/coffee is no longer an oversized tower, dairy/fish stay one-line where possible, and lower catalog rows are varied without invalid/non-rectangular grid areas.
- Fixed image scaling so category images are not scaled twice; sweets is less zoomed, meat is slightly closer, and grocery/tea keep controlled scale.
- Tightened title line-height and compact-card font sizing so two-line labels take less vertical space and long labels no longer visually stretch cards.
- Light theme got stronger separation for mint/leaf/pale cards and a clearer text backing so sweets/healthy/pale cards do not blend into the page.
- Category click transition was simplified for performance: shorter delay, no expensive filter animation, smaller transform.
- Verification: unit showcase test, i18n check, lint (0 errors, existing warnings), production build, and Chromium smoke passed; 393px viewport renders 18 cards, 0 overlaps, text widths fit.

### CATALOGSCREEN FIGMA MULTI-FRAME FIX 2026-05-05

- Found the real cause of the lower-layout mismatch: the Figma file has three separate frames. The first frame covers only the first 8 categories; the second/third frames define the lower bento rhythm.
- Updated lower category geometry semantics: `bread` is `wide`, `frozen` and `sauces_spices` are `hero`, matching the Figma frame proportions instead of treating them like small cards.
- `sauces_spices` title is now smaller and single-line so it no longer consumes a heavy text zone.
- Fresh Playwright smoke on 360/393/768 widths: 18 cards, 0 overlaps; category tap opens the product list/back state.
- Fresh verification: catalog unit test, i18n check, lint (0 errors, existing warnings), and build passed.

### AUTH OVERHAUL — ВЫПОЛНЕНО ✅ (2026-05-05)

**Полная профессиональная доработка авторизации.**

**Что сделано:**

1. **UpdatePasswordScreen** (`src/screens/UpdatePasswordScreen.jsx`) — НОВЫЙ экран
   - Форма ввода нового пароля после клика по ссылке сброса
   - Авто-вход после смены + редирект
   - Обработка истёкшего/неверного токена
   - Маршрут `/update-password` добавлен в App.jsx

2. **AuthScreen — полный рефакторинг** (`src/screens/AuthScreen.jsx`)
   - 3 таба: **Пароль** | **Код** (Email OTP) | **Телефон** (WhatsApp OTP)
   - Email OTP: `signInWithOtp({ email })` — бесплатный, безпарольный вход
   - WhatsApp OTP: `signInWithOtp({ phone, channel: 'whatsapp' })` — через Twilio
   - KZ формат номера +7XXXXXXXXXX с визуальной маской
   - Cooldown таймер 60 сек для resend OTP
   - Google OAuth loading state (больше не «зависает»)
   - Детект дублей email: «Этот email привязан к Google. Войдите через Google»
   - Все хардкод-цвета заменены на CSS-переменные
   - 68 i18n ключей (RU + KZ) — все новые экраны покрыты

3. **AccountScreen — секция «Способы входа»** (`src/screens/AccountScreen.jsx`)
   - Показывает привязанные методы: Email, WhatsApp, Google
   - Кнопка «Привязать Google» (linkIdentity)
   - redirectTo для resetPassword → `/update-password` (было `/auth?type=recovery` — БАГ)

4. **SetupProfileScreen + AccountScreen — CSS-переменные**
   - `#7C3AED` → `var(--primary)`
   - `#A78BFA` → `var(--primary-bright)`
   - `#10B981` → `var(--success-bright)`
   - `#DC2626` → `var(--error)`
   - `#8B5CF6` → `var(--primary-mid)`

5. **i18n** — 31 новый ключ (RU + KZ):
   - auth.updatePw*, auth.tab*, auth.emailOtp*, auth.phoneOtp*, auth.resend*
   - auth.errPhoneInvalid, auth.errOtpRateLimit, auth.errEmailDuplicate
   - auth.linkedMethods, auth.linkGoogle, auth.phoneNoWhatsApp

**Что требует настройки в Supabase Dashboard:**
- Phone provider: включить Twilio (пользователь зарегистрирует аккаунт)
- WhatsApp Business верификация (1-3 дня)
- Redirect URLs: добавить `/update-password`
- Проверить Resend SMTP / DNS (SPF, DKIM, DMARC для korset.app)

**Apple Sign-In:** Отложено до Apple Developer ($99/год) — не нужно для PWA
**WebAuthn/Passkeys:** Отложено до V2 — вход по отпечатку/face ID

**Верификация:**
- `npm run build` — PASS
- `npm run lint` — 0 errors (52 warnings, все pre-existing)
- `node scripts/check-i18n.mjs` — PASS (0 missing KZ)

### AUTH STRATEGY DISCOVERY 2026-05-05

- User wants a professional auth audit before implementation, especially password reset and removing Apple/SMS options.
- Direction under discussion: keep auth lean for V1, explore WhatsApp phone OTP for Kazakhstan users, avoid Telegram for now, and treat WebAuthn/Passkeys as likely post-V1.
- Open decisions before code: Supabase phone OTP provider, WhatsApp via Twilio/Twilio Verify or Send SMS Hook, account linking/duplicate identities, recovery UX, rate limits/CAPTCHA, no account enumeration, RU/KZ copy, buyer vs retailer auth differences.
