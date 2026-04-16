# 🚀 KÖRSET — БЫСТРЫЙ КОНТЕКСТ

> **Для ИИ-ассистента:** Этого файла достаточно для большинства задач. Глубокая архитектура → `ARCHITECTURE.md`. Текущие задачи → `TODO.md`.

---

## 📞 СВЯЗЬ И ЭСКАЛАЦИЯ (OWNER CONTACTS)
*Для ИИ-агентов и скриптов (Vercel/Supabase): В случае критических блокировок, изменения биллинга API, или когда архитектура непонятна — СТОП и запрос Approve по этим каналам:*
- **Email (Главный инбокс):** `founder@korset.app`
- **Telegram (Управление):** `[Проектный аккаунт в разработке]`
- **Instagram:** `@korset.app` (B2C маркетинг)

---

## Что такое Körset
**Store-context AI assistant** (mobile-first PWA) для офлайн-магазинов Казахстана.
Покупатель сканирует штрихкод → получает **Fit-Check** (подходит товар или нет) с учётом аллергий, Халал, диеты.
**Бизнес-модель B2B2C:** платят магазины (~15 000 тг/мес SaaS).

---

## Стек
| | |
|---|---|
| **Frontend** | React 18 + Vite + JavaScript (SPA) |
| **Backend** | Supabase (PostgreSQL, Auth, Storage) |
| **Стиль** | Dark Premium Glassmorphism, Vanilla CSS |
| **Шрифты** | `Advent Pro` (заголовки), `Manrope` (текст) |
| **Иконки** | **Только** `Material Symbols Outlined` (Google Fonts) |
| **Роутинг** | react-router-dom v6 |
| **i18n** | `useI18n` → `src/utils/i18n.js` (RU/KZ обязательно) |
| **Deploy** | Vercel + GitHub (`Korset-App/korset`) |
| **Data fetching** | `@tanstack/react-query` |

---

## Маршруты
```
/                           → Лендинг
/stores                     → Список магазинов
/s/:storeSlug               → Главный экран магазина (store-home)
/s/:storeSlug/scan          → Сканер
/s/:storeSlug/catalog       → Каталог
/s/:storeSlug/product/:ean  → Карточка товара
/s/:storeSlug/history       → История
/s/:storeSlug/profile       → Профиль
/admin                    → Root Admin (Загрузка баз CSV/Excel, управление)
/admin/rapid-scan         → Терминал оцифровки (RBAC: role=admin)
/retail                   → RetailEntryScreen (авто-redirect по owner_id)
/retail/:storeSlug/...    → Retail Cabinet (dashboard, products, settings)
```

---

## Структура проекта

```
korset/
├── src/
│   ├── App.jsx                  # Корневой роутинг
│   ├── main.jsx                 # Точка входа
│   ├── index.css                # Глобальные стили (Dark Premium)
│   ├── screens/                 # Экраны приложения
│   ├── components/              # Переиспользуемые компоненты
│   ├── contexts/                # React Context (Auth, Profile, Store, UserData)
│   ├── layouts/                 # AppLayout, PublicLayout, RetailLayout
│   ├── utils/                   # i18n, routes, fitCheck, supabase, storeCatalog...
│   ├── services/ai.js           # Сервис Körset AI
│   └── domain/product/          # Доменная логика товара
├── api/                         # Serverless API (Vercel Functions)
├── docs/                        # Документация проекта
│   ├── CONTEXT.md               # ⚡ Этот файл (быстрый контекст)
│   ├── ARCHITECTURE.md          # 📖 Полная архитектура
│   ├── TODO.md                  # 🎯 Трекер задач V1
│   └── CHANGELOG.md             # 📋 Лог изменений
├── supabase/                    # SQL-схемы базы данных
│   └── KORSET_DB_SCHEMA_FULL.sql
├── data/                        # Данные (products.json)
└── public/                      # Статические файлы (иконки, манифест)
```

---

## Что уже работает
- ✅ Лендинг (Glassmorphism, Bottom Nav скрыт)
- ✅ Supabase Auth (Google OAuth)
- ✅ Онбординг 2-шаговый + Edit Mode + юр. дисклеймер ИИ
- ✅ ProfileAvatar (AI-пресеты + фото из Storage + fallback)
- ✅ Сканер штрихкодов (`html5-qrcode`)
- ✅ AIScreen (чат с ИИ, привязан к продукту)
- ✅ Push-уведомления (Service Worker + VAPID + API)
- ✅ Rapid-Scan Admin (`/admin/rapid-scan`, RBAC)
- ✅ История + Избранное → Supabase sync
- ✅ Smart Merge — SyncResolveModal при конфликте локал/облако
- ✅ Retail Cabinet (Dashboard с аналитикой, Products с поиском/сканером/редактором)
- ✅ StoreContext → Supabase (localStorage cache)
- ✅ ESLint + Prettier + Husky + Playwright

---

## Железные правила (кратко)
1. **Сначала анализ → потом код.** Предложи план → получи апрув → правь.
2. **Не ломать работающее** (особенно: Onboarding, роутинг, `useI18n`, `ProfileContext`, `StoreContext`, `UserDataContext`).
3. **Экраны покупателя → только внутри `/s/:storeSlug/`.**
4. **Иконки только Material Symbols.** Никаких SVG.
5. **Аватары только `<ProfileAvatar />`.**
6. **Не переписывать стили** на светлые SaaS-шаблоны.
7. **Новый текст в UI → через `i18n.js`,** не хардкодить строки.
8. **Оценивай через B2B:** «Поможет ли это продать подписку магазину?»

---

## Текущий фокус

> Основной план к релизу → `ROADMAP_PILOT_V1.md` | Архитектура фаз → `ARCHITECTURE.md` (Раздел 17)

| Направление | Текущий фокус до 30 апреля | Статус |
|-------------|----------------------------|--------|
| **Consumer Дизайн** | Редизайн Лендинга (Glassmorphism), Главный экран (Stories), замена онбординга | 🔜 |
| **Consumer Производ.** | Оптимизация поиска/сканера, удаление JSON, автоматизация фото (Nano Banana 2) | 🔜 |
| **Consumer Данные** | Умный AI-чат, парсинг казахстанских баз, локализация (RU/KZ), реальные цены | 🔜 |
| **Retail Cabinet** | Доп. метрики, ручное добавление товаров, импорт, логотипы в Storage, RBAC | 🔜 |
| **Техдолг** | Material Symbols, i18n, Lazy loading, ErrorBoundary | 🔜 |

## V2 — заморожено (не делаем в V1!)
Оплата внутри приложения, доставка, чат с поддержкой магазина, геймификация, социальный функционал (поделиться сканом), карта магазина (планограмма).

---

*Подробная архитектура, AI-логика, бизнес-модель, roadmap → `ARCHITECTURE.md`*
*Что было сделано в прошлых сессиях → `CHANGELOG.md`*
