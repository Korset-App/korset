# 2026-09-25 — Catalog & Home Search UI Unification

## Что сделано

Полировка экрана каталога + унификация поиска с главным экраном (тёмная тема — приоритет, светлая не тронута кроме скан-кнопки).

1. **Единая иконка сканера.** `BarcodeScannerIcon` перерисован: точная конвертация глифа Material Symbols `barcode_scanner` (viewBox 960→24, уголки-кронштейны 2u + 6 штрихов штрих-кода) в чистый SVG. Единственное отклонение от глифа — 4 внешних угла видоискателя скруглены (radius 2u, arc на centerline + strokeLinejoin round). Моноколор через `color`/currentColor, зелёная линия старой иконки убрана. Иконка в BottomNav НЕ менялась (отдельный SVG, осознанно).
2. **Home:** глиф шрифта в скан-кнопке поиска заменён на SVG-компонент (`HomeScreen.jsx`). Поле поиска в тёмной теме — `var(--input-bg)` (чёрный, как в каталоге); светлая осталась #fff. Скан-кнопка — фиолетовый градиент `linear-gradient(145deg, var(--primary-mid), var(--primary))` + `var(--text-inverse)` в ОБЕИХ темах (решение пользователя).
3. **Catalog header:** убраны заголовок «Каталог», пилюля магазина (`catalog-store-pill` + CSS), подсказка «Сканируйте товары...» (`catalog-search-guide` + CSS). В режиме подкатегорий оставлены «назад» + название категории.
4. **Баг «серая полоса»:** причина — глобальный `.screen { padding-bottom: calc(88px + safe-area) }` при высоте nav 76px → 12px щель фона между контентом и nav. Fix: `paddingBottom: 0` inline на корне CatalogScreen. Контент уходит под nav (blur сглаживает).
5. **Пустота при доскролле:** `.catalog-showcase-scroll` padding-bottom 104→84, GridList 100→84, ListFooter 100→84 (nav 76 + 8px воздух).

## Удалённые i18n-ключи (ru+kz product.json)

`catalog.title`, `catalog.searchGuide`, `catalog.storeInfo`.

## Верификация

- `npm run check:agent:ui` — PASS (lint + i18n + build).
- Playwright-замер 390x844, обе темы: showcase bottom = 844 (щель исчезла, было 756), при доскролле зазор последней карточки до nav = 8px (было ~116px), home searchBarBg dark = rgba(0,0,0,0.3), скан-кнопка = фиолетовый градиент, iconIsSvg=true, glyphGone=true, pill/guide отсутствуют, в подкатегориях «назад»+заголовок на месте.

## Решения пользователя

- Иконка: nav-иконку оставить, везде остальное — SVG-копия Material-глифа со скруглёнными углами.
- Фиолетовая скан-кнопка: в обеих темах.
- Шапка подкатегорий: оставить «назад» + название категории.

---

# Фаза 2 (тот же день) — Секционный заголовок + Fit-Check строка + полиш карточек

## Контекст

После фазы 1 верх каталога остался без типографического якоря (только поиск). Референсы:
Яндекс Маркет/Ozon (поиск+чипы), Kaspi, Instacart/Target (department tiles + section header),
Uber Eats/Glovo (large title), App Store (тихие секционные строки), Yuka (без якоря — слабое место).
Решение пользователя: **E = large title «Категории» + подпись с магазином + Fit-Check строка**;
лёгкий полиш карточек.

## Что сделано

1. **Секционный заголовок** (внутри скролла витрины, только в режиме категорий):
   `catalog-section-title` «Категории» (font-display, clamp 24-30px) + `catalog-section-sub`
   «58 648 товаров · MARS». Пока каталог грузится — «Загрузка...» (паттерн старой пилюли).
2. **Fit-Check строка** под заголовком — дифференциатор проекта на витрине каталога:
   - Профиль настроен: чипы профиля (Халал/диеты/аллергены через DIET_PREFERENCES/ALLERGENS,
     DietIcon, cap 4 + «+N», ellipsis 132px) + счётчик «N товаров подходят вам».
   - Не настроен: dashed CTA «Настроить Fit-Check» с иконкой SlidersIcon.
   - Клик открывает переиспользованный `FitCheckDrawer` (портал, framer-motion, общий чанк).
   - Счётчик: deferred setTimeout(400ms) pass `checkProductFit` по baseProducts — не блокирует рендер.
3. **Карточки категорий**:
   - Корень проблемы: в CSS НЕ БЫЛО правила `[data-text='dark']` — 11 из 18 категорий с
     textTone:'dark' рендерились белым; нижний скрим уходил в bg-app (мутный в тёмной теме).
   - Фикс: `::after` всех карточек → tone-a 55% (тон самой карточки), обе темы унифицированы,
     удалены избыточные light-переопределения и мёртвый data-text='light' ::after.
   - Базовый text-shadow на заголовок (был только в light).
   - imageScale кап ≤ 1.04 (meat 1.12, tea_coffee 1.12, grocery 1.08, household 1.02 — в JS и CSS),
     drop-shadow 7px/34% → 5px/26%.

## i18n

Добавлены (ru/kz product.json): `catalog.categoriesTitle`, `catalog.categoriesSub`,
`catalog.fitFitCount`, `catalog.fitSetupTitle`, `catalog.fitSetupHint`.

## Верификация

- `check:agent:ui` PASS (lint + i18n + build). FitCheckDrawer → shared chunk 6.79 kB.
- Playwright 390x844, dark/light × empty/configured: заголовок+подпись рендерятся, CTA/чипы
  переключаются по профилю, «+1» overflow работает, чип ellipsis работает.
- **НЕ верифицировано (блокер окружения):** RPC `fn_get_store_catalog` отдаёт HTTP 500 в dev
  (проверено git stash на чистом дереве — не связано с UI-правками; вероятно параллельная
  каталог-V4 сессия/миграции). Из-за этого count в подписи и fitCount не прогнаны на реальных
  данных — только на логике. Плюс: пока RPC падает, подпись честно показывает «Загрузка...»,
  а не «0 товаров» (это исправлено в рамках фазы).

## Заметка

`npm run memory:save` падает (embeddings HTTP 404) — инфраструктурная проблема пайплайна,
не связана с UI. Перезапустить после починки.

---

# Фаза 3 (тот же день) — Шапка-«лист» со scroll-морфингом + «Фильтр состава»

## Решения пользователя

- Поисковая строка = постоянная шапка → сделать акцентным «листом»: заливка от верха экрана
  (вкл. safe-area), снизу два закруглённых угла 24px, тонкая фиолетовая градиент-линия по кромке.
- Scroll-морфинг: прогресс 0→1 за 72px скролла → тень проявляется, акцент-линия разгорается,
  контент-строка сжимается (scale 0.975, translateY -1px). Обратно при возврате наверх.
- Perf-контракт: только transform/opacity (compositor), один passive scroll-листенер + rAF,
  одна CSS-переменная --hdr-progress на .catalog-topbar, ноль setState в кадре, БЕЗ
  backdrop-filter (непрозрачный фон), prefers-reduced-motion уважается.
- Сканер в шапке каталога → фиолетовый градиент (единый акцент с home и BottomNav).
- Строка секции: «Категории» слева + кнопка «Фильтр состава» справа (SlidersIcon):
  неактивна = нейтрал «Настроить»; активна = фиолетовая пилюля «N фильтров · Подходит: M»
  (ru-склонение через Intl.PluralRules). Подпись «N товаров · MARS» и чипы-строка удалены
  (пользователь: возвращённый шум, иерархия ломалась).
- FitCheckDrawer остаётся точкой входа редактирования; счётчик подходящих товаров —
  deferred checkProductFit по baseProducts (400ms).

## Уроки

1. **TDZ-краш**: useEffect с deps [showCategories,...] объявлен ДО const-деклараций этих
   переменных ниже по компоненту → "Cannot access before initialization" (поймал только
   рантайм-тест, build/eslint не ловят). Эффект перемещён после деклараций. Правило:
   эффекты с deps на render-константы держать ниже их объявления.
2. ESLint проекта не имеет browser-globals: window.requestAnimationFrame обязателен
   (bare requestAnimationFrame = no-undef error).

## i18n

ru/kz product.json: добавлены `catalog.fitButtonTitle` («Фильтр состава»/«Құрам сүзгісі»),
`catalog.fitSetupAction`, `catalog.fitFiltersOne/Few/Many` (kz — одна форма «сүзгі»),
`catalog.fitMatches`; удалены `catalog.categoriesSub`, `catalog.fitFitCount`,
`catalog.fitSetupTitle`, `catalog.fitSetupHint`.

## Верификация

- `check:agent:ui` PASS (после фиксов TDZ + window.rAF + удаление забытого fit-row JSX).
- Playwright обе темы × empty/configured: radius 0 0 24px 24px; progress 0→1 при скролле 300px;
  row transform matrix(0.975,…,-1); shadow opacity 1; сканер — фиолетовый градиент;
  кнопка «Фильтр состава» = «Настроить»/«5 фильтров»+is-active.
- Скриншоты: Temp\opencode\v6_catalog_*.png.
