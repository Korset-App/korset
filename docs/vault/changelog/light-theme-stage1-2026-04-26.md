# Light Theme Stage 1 — 2026-04-26

> Домен: changelog  
> Статус: completed
> Связи: [[v1-zero-friction-and-light-premium-2026-04-26]] · [[light-theme-stage2-2026-04-26]]

---

## Summary

Первый implementation-этап светлой темы выполнен как foundational rollout: добавлена theme-system, сохранение выбора, premium toggle в профиле и перевод общих shell/nav/modal слоёв на semantic tokens.

---

## Implemented

1. `src/utils/theme.js`
   - `light` / `dark` как единственные пользовательские режимы.
   - Initial value: сохранённый `localStorage.korset_theme`, иначе system `prefers-color-scheme`.
   - `applyTheme()` обновляет `document.documentElement.dataset.theme`, `color-scheme`, `meta[name="theme-color"]`, `localStorage` и диспатчит `korset:theme-change`.
   - `useTheme()` даёт React API: `theme`, `setTheme`, `toggleTheme`, `isLight`.

2. `index.html`
   - Early bootstrap темы до React, чтобы уменьшить flash неправильной темы.
   - Убран дублирующий `theme-color`.

3. `src/index.css`
   - Расширены dark tokens.
   - Добавлен `:root[data-theme='light']` в направлении crystal / pearl white glassmorphism.
   - Добавлены semantic tokens для app shell, glass surfaces, overlay, nav, retail, inputs, shadows.
   - Добавлена premium-анимация theme sweep и glass toggle.
   - Добавлен `prefers-reduced-motion` fallback.

4. Profile entry point
   - `ProfileScreen` подключает `useTheme()`.
   - Пункт "Тема" теперь переключает тему вместо `comingSoon`.
   - Toggle сделан в стиле стеклянной капсулы с солнцем/луной и движущимся thumb.

5. Shared shell layers
   - `BottomNav`, `RetailBottomNav`, `RetailLayout`, `ConfirmDangerModal`, `SyncResolveModal` и базовые CSS shell слои переведены на semantic tokens.

---

## Verification

1. `npm run lint` — pass, 44 warnings, 0 errors.
2. `npm run build` — pass; остаются существующие Vite/PWA warnings про mixed dynamic/static imports и крупный chunk.
3. `npm test` — pass, 4/4 Playwright e2e.

---

## Next

Этап 2 должен переводить customer/public/auth route set: `HomeScreen`, `CatalogScreen`, `ProductScreen`, `UnifiedProductScreen`, `HistoryScreen`, `AuthScreen`, `SetupProfileScreen`, `StorePublicScreen`, `StoresScreen`, `NotificationSettingsScreen`, `PrivacySettingsScreen`.

Главный принцип следующего этапа: не менять характер dark premium, а заменить hardcoded dark surfaces на semantic tokens так, чтобы light theme выглядела равноценной, а не упрощённой.
