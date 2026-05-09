# 2026-04-28 — Lazy Routes (HARDENING Этап 5)

> Связи: [[auth-flow]] · [[offline-resilience]]

**Commit:** `dd4428e`
**Scope:** routing, bundle optimization
**Status:** ✅ завершено

## Что сделано

1. **RouteLoader.jsx** — новый Suspense fallback компонент:
   - CSS-спиннер с `var(--primary)` и `var(--glass-border)`
   - i18n `t.common.loading` (RU: «Загрузка…», KZ: «Жүктелуде…»)
   - `role="status"` + `aria-live="polite"` для доступности

2. **App.jsx** — lazy-loading для всех экранов:
   - 29 screen/layout компонентов конвертированы в `React.lazy()`
   - `Routes` + `OnboardingScreen` обёрнуты в `<Suspense fallback={<RouteLoader />}>`
   - BottomNav и OfflineBanner оставлены eager (всегда видны)

## Результаты

| Метрика | До | После | Дельта |
|---------|----|-------|--------|
| Initial JS bundle (entry) | ~1091 kB | ~522 kB | **−52%** |
| Gzipped entry | ~317 kB | ~164 kB | −48% |
| Unit tests | 93/93 | 93/93 | — |
| Lint errors | 0 | 0 | — |

Vite разбил каждый экран на отдельный chunk:
- `ProductScreen-DJYkWp4I.js` — 21.87 kB
- `ScanScreen-9WsY1PL1.js` — 22.26 kB
- `HomeScreen-BzAhJOdb.js` — 49.10 kB
- `ProfileScreen-DkCHtNCY.js` — 47.10 kB

## Следующий шаг

Рефакторинг `ProductScreen.jsx` (1315 строк → 5+ компонентов).
