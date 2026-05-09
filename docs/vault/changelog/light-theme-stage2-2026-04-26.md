# Light Theme Stage 2 — 2026-04-26

> Домен: changelog  
> Статус: completed
> Связи: [[v1-zero-friction-and-light-premium-2026-04-26]] · [[light-theme-stage1-2026-04-26]]

---

## Summary

Второй этап внедрения светлой темы перевёл основные customer/public/auth экраны Körset на semantic theme tokens. Цель этапа: убрать ощущение half-dark/half-light на типичном пользовательском пути, не меняя dark premium как визуальный эталон.

---

## Implemented

1. `src/index.css`
   - Добавлены дополнительные semantic tokens: `--glass-subtle`, `--glass-muted`, `--glass-soft-border`, `--glass-strong-border`, `--line-soft`, `--image-bg`, `--text-soft`, `--text-faint`, `--text-disabled`, `--icon-muted`, `--badge-bg`, `--badge-border`, `--accent-sky`, `--accent-sky-dim`, `--accent-sky-border`, `--shadow-card`.
   - Tokens заданы для dark и light, чтобы dark theme сохранила текущий характер, а light получила pearl/crystal glass surfaces.

2. Buyer-facing screens
   - `HomeScreen`: store home и landing-секции переведены с dark inline surfaces на tokens.
   - `CatalogScreen`: list/grid cards, search, filters, sort chips и compare banner переведены на tokens.
   - `ProductScreen`: product header, carousel surfaces, fit details, diet badges, nutrition, ingredients, specs, description и secondary buttons частично переведены на tokens.
   - `UnifiedProductScreen`: header, hero card, image surface, status/info/nutrition cards переведены на tokens.
   - `HistoryScreen`: sticky header, tabs, empty states, list items и image placeholders переведены на tokens.

3. Public/auth/settings screens
   - `AuthScreen`: form card, inputs, helper text, Google button, dividers, password rules и secondary text переведены на tokens.
   - `SetupProfileScreen`: setup/edit backgrounds, cards, avatar grid, inputs и helper text переведены на tokens.
   - `StorePublicScreen`: store header, logo fallback, description/contact/features cards и CTAs переведены на tokens.
   - `StoresScreen`: list cards, header back button, logo fallback и text colors переведены на tokens.
   - `NotificationSettingsScreen` и `PrivacySettingsScreen`: section labels, rows, toggles, dividers, intro/status cards и time inputs переведены на tokens.

---

## Verification

1. `npm run lint` — pass, 44 warnings, 0 errors.
2. `npm run build` — pass; остаются существующие Vite/PWA warnings про mixed dynamic/static imports и крупный chunk.
3. `npm test` — pass, 4/4 Playwright e2e.

---

## Remaining For Stage 3

1. Scanner/camera flow: `ScanScreen`, camera overlays, manual input, recent scans, torch/gallery controls.
2. Retail deep pass: `RetailDashboardScreen`, `RetailProductsScreen`, `RetailImportScreen`, `RetailSettingsScreen`, `RetailEntryScreen`.
3. PWA polish: manifest colors, browser chrome/status bar, standalone feel.
4. Final visual regression pass across dark/light on landing, store home, catalog, product, profile, scanner and retail.
