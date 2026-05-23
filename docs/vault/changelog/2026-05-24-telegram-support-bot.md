# Telegram Support Bot — Реализация

## Что сделано

Создан и запущен Telegram-бот поддержки @korset_support_bot.

### Phase 0 — Настройка
- Создан бот через BotFather (username: korset_support_bot, display name: @korset_support)
- Получен токен и chat_id оператора
- Добавлены env vars в Vercel: TELEGRAM_SUPPORT_BOT_TOKEN, TELEGRAM_OPERATOR_CHAT_ID

### Phase 1 — Инфраструктура
- Миграция 038_support_tickets.sql: таблицы support_tickets, support_messages
- Webhook endpoint: `POST /api/telegram-webhook`
- Webhook URL: `https://korset.vercel.app/api/telegram-webhook`
- Решена проблема совместимости grammy + Vercel → переписано на raw Telegram API (fetch)

### Phase 2 — Команды и меню
- /start — приветствие с inline-кнопками (FAQ, Задать вопрос, О Körset)
- /faq — список частых вопросов с навигацией
- /about — информация о проекте
- /support — предложение задать вопрос
- FAQ ответы с кнопками «Помогло» / «Связаться с оператором»
- Callback-обработка: main_menu, faq, ask, about, faq_N, resolved, transfer

### Phase 2.5 — Ссылки на сайте
- SupportBottomSheet.jsx: `t.me/korset_support → t.me/korset_support_bot`
- LandingScreen.jsx: `t.me/korset_app → t.me/korset_support_bot`
- Локали RU/KZ home.json: обновлены

### Phase 3 (partial) — Оператор
- Создание тикета при запросе оператора
- Уведомление оператору в Telegram с кнопкой «Взять тикет»
- Ответ оператора через reply на уведомление
- Закрытие тикета пользователем
- История сообщений в Supabase

## Файлы
- `api/telegram-webhook.js` — основной обработчик (raw API, без grammy)
- `src/telegram-bot/i18n.js` — RU/KZ тексты
- `src/telegram-bot/supabase.js` — Supabase клиент (справочно)
- `supabase/migrations/038_support_tickets.sql`

## Что не сделано (Phase 3 — AI)
- AI-ответы через OpenAI — запланировано
- FAQ ответы пока статические (из i18n)
