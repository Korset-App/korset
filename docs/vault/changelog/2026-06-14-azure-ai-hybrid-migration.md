---
domain: changelog
created: 2026-06-14
updated: 2026-06-14
tags: [azure, ai, deepseek, gpt-4o-mini, embeddings, cost-control]
---

# Миграция на Azure OpenAI и гибридную схему ИИ

## Контекст и Решение
Для снижения затрат на ИИ и использования стартап-гранта Microsoft Azure, все ИИ-сервисы (чат-ассистент, RAG-эмбеддинги, распознавание изображений, Telegram-бот поддержки и локальные скрипты перевода) переведены на работу через **Azure AI Foundry API Gateway** с использованием гибридной схемы распределения нагрузки по моделям.

## Конфигурация моделей в Azure
* **Основной чат-ассистент (`OPENAI_CHAT_MODEL`):** `DeepSeek-V4-Flash` — для текстовых диалогов покупателей.
* **Распознавание изображений (`OPENAI_VISION_MODEL`):** `gpt-4o-mini` — для разбора составов на фото.
* **Распознавание голоса (`OPENAI_TRANSCRIPTION_MODEL`):** `gpt-4o-mini-transcribe` — для перевода аудио в текст.
* **Векторная память (`text-embedding-3-small`):** Используется для поиска RAG-контекста по базе знаний.

## Выполненные изменения в кодовой базе
1. **[api/ai.js](file:///c:/projects/korset/api/ai.js):**
   * Изменена функция `fetchRagContext` — генерация эмбеддингов для RAG теперь идет динамически через `process.env.OPENAI_API_BASE_URL` с передачей заголовка `api-key` при обращении к ресурсам Azure (ранее эндпоинт был жестко зашит на `api.openai.com`).
2. **[src/telegram-bot/ai.js](file:///c:/projects/korset/src/telegram-bot/ai.js):**
   * Логика запросов поддержки адаптирована для динамического использования `process.env.OPENAI_API_BASE_URL` и Azure-заголовков авторизации.
3. **Локальные скрипты перевода:**
   * В [translate-composition.cjs](file:///c:/projects/korset/scripts/translate-composition.cjs) и [translate-names-kz.mjs](file:///c:/projects/korset/scripts/translate-names-kz.mjs) добавлен аналогичный динамический резолвинг базового URL и заголовков Azure.

## Контроль затрат (Cost Control)
* Установлена себестоимость одной сессии активности пользователя: **$0.003185** (всего 0.32 цента).
* На бюджет в **$10** система способна обслужить **~3 140 сессий**.
* Для жесткого лимита расходов в Azure Cost Management настроен **Budget Alert** на $10 с Action Group, временно блокирующей доступ к API при превышении лимита.
* ** Marketplace Nuance:** `DeepSeek-V4-Flash` поставляется через Azure Marketplace и может списываться с банковской карты (в зависимости от условий гранта). В случае прямых списаний чат-модель следует переключить на `gpt-4o-mini`, которая на 100% покрывается грантом Microsoft.
