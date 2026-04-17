# Auth Flow Architecture

> Домен: architecture / auth-flow
> Обновлено: 2026-04-17
> Связи: [[product-resolution]] · [[retail-cabinet]] · [[fit-check-engine]]

---

## Провайдеры

- Google OAuth (основной, через Supabase Auth)
- Email/Password (резервный)
- Apple ID (НЕ реализован — Фаза 5 Roadmap)

---

## Порядок провайдеров в App.jsx

```
ErrorBoundary
  → AuthProvider (user, session, loading)
    → UserDataProvider (favoriteEans, scanCount)
      → StoreProvider (currentStore, storeSlug)
        → ProfileProvider (profile, syncConflict)
          → AppInner
```

**Проблема:** StoreProvider вложен в UserDataProvider, но не зависит от него. Это вызывает лишние перерендеры.

---

## Критические баги AuthContext

1. **Нет timeout на getSession()** — если Supabase недоступен при запуске, loading=true навсегда
2. **Race condition** — getSession().then() и onAuthStateChange могут сработать одновременно
3. **loadOrCreateUserRow** — до 3 round-trips для создания/поиска строки users

---

## Onboarding Flow

1. Пользователь открывает приложение → `/` (лёндинг)
2. Выбирает магазин → `/s/:storeSlug`
3. Если `!localStorage.korset_onboarding_done` → OnboardingScreen (2 шага)
4. Шаг 1: Выбор языка (RU/KZ)
5. Шаг 2: Базовый профиль (аллергены, диета)
6. Завершение → `localStorage.korset_onboarding_done = true`
7. Если пользователь авторизован но `!user.user_metadata.profile_setup_done` → редирект на `/setup-profile`

---

## Profile Sync (Cloud/Local)

- Локальный профиль: `localStorage.korset_profile`
- Облачный профиль: `public.users.preferences` (jsonb)
- При авторизации: ProfileContext проверяет конфликт (profileSync.js)
- Конфликт → SyncResolveModal (выбор: локальный / облачный / объединить)
- Объединение: аллергены = union, dietGoals = union, halal =云端 приоритет если differs

---

## Auth Navigation Helpers

Файл `src/utils/authFlow.js`:

- `normalizeReturnTo(path)` — защита от open-redirect (проверяет что путь начинается с `/`)
- `getReturnTo(location)` — извлекает redirect из state или query
- `buildAuthNavigateState(location)` — строит router state для редиректа после логина
