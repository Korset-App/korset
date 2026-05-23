# Telegram Support Bot Specification

## Executive Summary

Telegram-bot @korset_support — система поддержки покупателей Körset. Гибридная архитектура: AI-ответы (OpenAI) на частые вопросы с эскалацией на живого оператора. Оператор отвечает через личный чат с ботом. Все тикеты и сообщения сохраняются в Supabase.

## Problem Statement

- У пользователей Körset нет канала связи с поддержкой
- На сайте заглушка с ссылкой на Telegram, но самого бота нет
- Пользователи не могут задать вопрос по халалу, аллергиям, работе приложения

## Success Criteria

- Бот отвечает на типовые вопросы через AI без участия оператора
- При эскалации оператор получает уведомление и отвечает через Telegram
- Все диалоги сохраняются в Supabase
- Поддержка русского и казахского языков

## Technical Architecture

### Stack
- **Runtime:** Node.js — Vercel Serverless Function
- **Library:** grammY (современная, serverless-friendly)
- **Database:** Supabase PostgreSQL — таблицы `support_tickets` и `support_messages`
- **AI:** OpenAI через существующую инфраструктуру проекта
- **Deployment:** Vercel (webhook), локально — polling

### Data Model

```sql
-- Таблица тикетов
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT NOT NULL,
  telegram_username TEXT,
  telegram_first_name TEXT,
  telegram_language_code TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  -- status: new, ai_answered, waiting_operator, in_progress, closed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Таблица сообщений
CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'ai', 'operator')),
  message_text TEXT,
  telegram_message_id INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### System Components

```
Telegram User          Telegram Bot (Vercel)        Supabase        OpenAI
    |                        |                        |               |
    |--- /start ------------->|                        |               |
    |<--- Приветствие + Меню -|                        |               |
    |                        |                        |               |
    |--- "Вопрос по халалу" ->|                        |               |
    |                        |--- save ticket -------->|               |
    |                        |--- AI context --------->|               |
    |                        |<--- AI response --------|               |
    |<--- AI ответ ----------|                        |               |
    |                        |--- save message ------->|               |
    |                        |                        |               |
    |--- "Не помогло" ------->|                        |               |
    |                        |--- update ticket ------>|               |
    |                        |--- notify operator ---->|               |
    |<--- Передано оператору -|                        |               |
    |                        |                        |               |
  Operator Bot              |                        |               |
    |                        |                        |               |
    |<--- new ticket --------|                        |               |
    |--- reply (ответ) ----->|                        |               |
    |                        |--- save message ------->|               |
    |<--- ответ пользователю -|                        |               |
```

### Bot Commands (BotFather)

| Command | Description |
|---------|-------------|
| /start | Приветствие и главное меню |
| /faq | Частые вопросы |
| /support | Связаться с поддержкой |
| /about | О Körset |

### User Journey

**First Visit:**
1. Пользователь нажимает /start
2. Бот приветствует по имени: «Здравствуйте, Алексей! Я — бот поддержки Körset. Чем могу помочь?»
3. Под сообщением Inline-меню:
   - ❓ Частые вопросы
   - 📝 Задать вопрос
   - 📖 О Körset
4. В Menu Button: /start, /faq, /support, /about

**FAQ:**
1. Пользователь нажимает «❓ Частые вопросы»
2. Бот показывает список тем Inline-кнопками:
   - 🔍 Как сканировать товары?
   - 🥩 Что такое Fit-Check?
   - 🕌 Как определяется халяль?
   - ⚠️ Товар не найден
   - 🔙 Назад
3. При выборе темы — AI-ответ

**Задать вопрос:**
1. Пользователь нажимает «📝 Задать вопрос»
2. Бот: «Опишите ваш вопрос подробнее. Мы ответим как можно скорее.»
3. Пользователь пишет вопрос
4. AI пытается ответить (контекст: FAQ, правила Körset)
5. После AI-ответа Inline-кнопки: «✅ Помогло» / «👨‍💼 Связаться с оператором»
6. Если AI не уверен — сразу: «👨‍💼 Передать оператору»

**Оператор:**
1. При эскалации бот присылает оператору в личный чат:
   ```
   🔔 Новый вопрос от @username_пользователя
   
   Текст вопроса...
   
   [Ответить] [Посмотреть историю]
   ```
2. Оператор отвечает reply на это сообщение
3. Бот отправляет ответ пользователю
4. Когда пользователь отвечает — бот пересылает оператору reply на предыдущее сообщение

### AI Context

AI-система получает в каждый запрос:
- Роль: дружелюбный консультант поддержки Körset
- FAQ проекта (10 вопросов-ответов)
- Правила: не выдумывать, не давать медицинских советов, ссылаться на приложение
- Язык ответа: RU или KZ (определяется по языку пользователя в Telegram)
- Если вопрос требует вмешательства человека — предложить оператора

### Operator Flow

- Все сообщения оператора идут через личный чат с ботом
- Бот сохраняет контекст: к какому тикету относится каждое сообщение
- Можно ответить текстом, фото
- При добавлении новых операторов — распределение через группу

### File Structure

```
api/
  telegram-webhook.js     — Vercel Serverless: webhook от Telegram

src/
  telegram-bot/
    bot.js                — Инициализация бота (grammY)
    handlers.js           — Обработчики команд и сообщений
    ai.js                 — OpenAI integration
    menu.js               — Inline-меню и клавиатуры
    operator.js           — Логика оператора (уведомления, ответы)
    supabase.js           — Сохранение тикетов и сообщений
    i18n.js               — Тексты на RU и KZ

supabase/
  migrations/
    037_support_tickets.sql — Создание таблиц поддержки
```

### Non-Functional Requirements

- Webhook timeout: Vercel имеет лимит 10s на Serverless — достаточно для AI
- Те же env-переменные OpenAI, что и в проекте
- Supabase service-role key для записи в БД
- TELEGRAM_SUPPORT_BOT_TOKEN — отдельный токен (не путать с TELEGRAM_BOT_TOKEN для Sentry)
- TELEGRAM_OPERATOR_CHAT_ID — chat_id оператора для уведомлений

## Out of Scope (V1)

- Веб-админка для операторов
- Интеграция с БД Körset (пользователи, товары, сканы)
- Тяжёлые медиафайлы (видео, документы)
- Rich ответы с кнопками товаров / ссылками на приложение
- Статистика и аналитика
- Автоматическое закрытие тикетов по таймеру

## Implementation Plan

### Phase 1 — Foundation (2-3 дня)
1. Создать миграцию support_tickets в Supabase
2. Написать базового бота на grammY: /start, /faq, /support, /about
3. Inline-меню (приветствие, навигация)
4. Сохранение сообщений в Supabase
5. Деплой webhook на Vercel

### Phase 2 — AI + Operator (2-3 дня)
1. AI-обработчик вопросов (OpenAI + FAQ контекст)
2. Логика эскалации: AI → оператор
3. Уведомления оператору через бота
4. Reply-механизм для ответов оператора
5. RU + KZ локализация

### Phase 3 — Polish (1 день)
1. Обработка ошибок
2. Rate limiting
3. Команды BotFather
4. Финальный деплой и тестирование
