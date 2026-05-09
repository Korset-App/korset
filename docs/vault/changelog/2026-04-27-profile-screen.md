---
date: 2026-04-27
type: changelog
status: completed
related: [[profile-redesign]] · [[auth-system]]
---

# ProfileScreen Redesign — Завершение

## Что сделано

### Новый экран: AccountScreen
- Файл: `src/screens/AccountScreen.jsx`
- Маршрут: `/s/:storeSlug/account` (добавлен в App.jsx + routes.js)
- Функционал:
  - Email пользователя (read-only)
  - Дата регистрации
  - ID пользователя (monospace)
  - Статус владельца магазина (если `currentStore.owner_id === user.id`)
  - Кнопка "Сменить пароль" — отправляет reset email через Supabase
  - Кнопка "Выйти из аккаунта" (в секции "Опасная зона")
  - i18n: RU + KZ полностью

### ProfileScreen — структурные изменения
- **Личные данные** → теперь ведёт на `AccountScreen` (вместо SetupProfileScreen)
- **Справка + О приложении** → объединены в один пункт "Помощь и о приложении"
- **Retail Cabinet** — показывается ТОЛЬКО если `currentStore.owner_id === user.id`
- **Карандаш (Edit)** → ведёт на `ProfileEditScreen` (аватар/баннер/ник) — как и задумано
- **Фикс кодировки**: `РЈРїСЂР°РІР»РµРЅРёРµ` → "Управление магазином"

### Визуальная полировка
- **Name pill** (под аватаром): `color: '#fff'` → `var(--text)`, background → `var(--glass-strong)`
- **Guest banner backdrop**: через CSS переменные вместо хардкода
- **Footer**: версия `v1.0.0`, эмодзи-флаг 🇰🇿 заменён на SVG флаг Казахстана (3 золотых орнамента на бирюзовом фоне)

### ProfileEditScreen — тема-зависимость
- Sticky header: хардкод `rgba(12,12,14...)` → `var(--glass-strong)`
- Back button: stroke через `var(--text)`
- Title text: `#fff` → `var(--text)`
- Name input: background/border/color через CSS переменные
- SelectedDot border: `#0c0c0e` → `var(--bg-app)` (адаптируется к теме)
- Error colors: `#FCA5A5`, `#EF4444` → `var(--error-bright)`

### SetupProfileScreen
- Error color: `#FCA5A5` → `var(--error-bright)`

## i18n добавлено
- `profile.helpAbout` / `profile.helpAboutAria` — RU/KZ
- Полный блок `account:` — RU/KZ (title, sectionAccount, emailLabel, joinedLabel, idLabel, sectionSecurity, changePassword, resetSent, resetError, sectionDanger, logout, storeOwnerTitle)

## Файлы изменены
- `src/screens/AccountScreen.jsx` — новый
- `src/screens/ProfileScreen.jsx` — навигация, цвета, footer, кодировка
- `src/screens/ProfileEditScreen.jsx` — цвета для светлой темы
- `src/screens/SetupProfileScreen.jsx` — цвет ошибки
- `src/App.jsx` — маршрут `/account`
- `src/utils/routes.js` — `buildAccountPath()`
- `src/utils/i18n.js` — ключи account + helpAbout
- `docs/CONTEXT.md` — обновлён

## Сборка
- `npm run build` ✅ — 9.08s, exit code 0
