# 2026-09-25 — Scroll-lock оверлеев: фикс «половинного» блюра аватар-меню

## 1. Симптом

На смартфоне при открытом аватар-меню (HomeScreen) свайп прокручивал страницу под
оверлеем: блюр-бэкдроп зависал артефактом на верхней половине экрана, нижняя
половина оставалась «живой» — грубый визуальный разрыв.

## 2. Причины (3 слоя)

1. **Скролл происходит в `.screen`, а не в body.** `body { overflow: hidden }`
   (index.css) — реальный скролл-контейнер это `<main class="screen">`. Все
   существующие «блокировки» через `document.body.style.overflow = 'hidden'`
   (лайтбокс, шторки, AI-history, landing-меню) были no-op для прокрутки.
2. **Оверлей меню жил внутри `.screen`.** Тач по бэкдропу — потомок скролл-
   контейнера → iOS прокручивал `.screen` под `position: fixed` оверлеем,
   а слой `backdrop-filter` застывал (stale compositing) → «половинный» блюр.
3. **`touch-action` не был запрещён** на бэкдропе — жесты скролла стартовали
   прямо с оверлея.

## 3. Решение

- **Новый хук `src/hooks/useOverlayLock.js`** — ref-counted (счётчик ссылок,
  безопасно при наложении оверлеев) scroll-lock реальных контейнеров:
  `html + body + все '.screen'` (+ `touch-action: none` на них) с сохранением
  предыдущих inline-значений. Паттерн повторяет уже существующий правильный
  `FitCheckDrawer.css` (html/body/.home-screen + touch-action).
- **HomeScreen:** меню аватара рендерится через `createPortal(document.body)` —
  вне `.screen`, `position: fixed` с координатами от `getBoundingClientRect()`
  кнопки (измерение в клике + resize-пересчёт). Бэкдропу добавлен
  `touch-action: none`. Бонус: закрытие по Escape.
- **Единообразие («везде»):** фейковые `document.body.style.overflow`-локи
  заменены на хук: HomeScreen лайтбокс, AIAssistantScreen history,
  ProductSubmissionSheet, ImageCarousel lightbox, SupportBottomSheet,
  AuthPromptModal, LandingScreen menu. FitCheckDrawer не тронут (уже правильный).

## 4. Verification

- `npm run lint` — 0 errors; предупреждения в затронутых файлах только старые
  (попутно устранены 4: мёртвый `mounted`-стейт SupportBottomSheet и др.).
- `npm run build` — OK. `npm run test:unit` — 643/643. `check:agent:ui` — PASS.
- Браузерный smoke локального dev-сервера невозможен: нет `.env` → Supabase не
  инициализируется → шапка магазина не рендерится. Финальная проверка тач-
  поведения — на реальном смартфоне/прод-превью владельцем.

## 5. Файлы

`src/hooks/useOverlayLock.js` (новый), `src/screens/HomeScreen.jsx/.css`,
`src/screens/AIAssistantScreen.jsx`, `src/screens/LandingScreen.jsx`,
`src/components/product/ProductSubmissionSheet.jsx`,
`src/components/product/ImageCarousel.jsx`, `src/components/SupportBottomSheet.jsx`,
`src/components/AuthPromptModal.jsx`.
