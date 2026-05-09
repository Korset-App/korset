# Стабилизация проверок - 2026-04-24

> Связи: [[retail-cabinet]] · [[monitoring-runbook]]

## Фокус

Короткий стабилизационный шаг перед началом бизнес-критичной фичи `RetailImportScreen`.

## Изменено

- `.gitignore` — добавлен `test-results/`, чтобы Playwright-артефакты не попадали в `git status`.
- `src/screens/AuthScreen.jsx` — `EyeBtn` вынесен из render на уровень модуля. Это сняло 2 lint errors `react-hooks/static-components`.
- `tests/e2e/landing.spec.js` — обновлены устаревшие проверки: landing проверяет конкретный heading `Körset`, store route проверяет загрузку app shell вместо старого текста `Магазин 1`; навигация использует `waitUntil: 'domcontentloaded'`, чтобы тесты не падали из-за долгих внешних ресурсов.

## Проверено

- `npm run lint` — проходит, 0 errors, 46 warnings.
- `npm run build` — проходит, PWA build OK. Остались предупреждения Vite о смешанных static/dynamic imports для `supabase.js` и `offlineDB.js`.
- `npm test` — проходит, 4/4 e2e tests.

## Дальше

1. Реализовать настоящий `RetailImportScreen`: CSV/XLSX parsing, preview, validation, duplicate detection, upsert store products/prices, error report.
2. Позже отдельно разобрать 46 lint warnings.
