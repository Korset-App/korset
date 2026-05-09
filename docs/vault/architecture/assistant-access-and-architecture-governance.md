# Assistant Access and Architecture Governance

> Домен: architecture
> Дата: 2026-04-24
> Связи: [[assistant-memory-pipeline]] · [[architecture-decisions]] · [[monitoring-runbook]] · [[2026-05-06-agent-memory-system-normalization]] · [[multi-llm-coordination-2026-04-25]]

## Цель

Korset должен развиваться быстро, но без выдачи ассистенту неограниченного контроля над production-данными. Рабочий процесс строится вокруг минимально достаточного доступа, явного апрува на рискованные операции и архитектурной дисциплины перед новыми фичами.

## Текущий доступ ассистента

Локально доступны код проекта, миграции, vault, тесты и `.env.local`. В `.env.local` присутствуют ключи для Supabase, OpenAI, NPC, USDA, Cloudflare R2 и Vercel.

Важно: наличие ключей в окружении технически позволяет писать скрипты, которые читают или меняют production-данные. Поэтому любые операции с внешней инфраструктурой должны быть разделены на уровни риска.

## Уровни доступа

### Level 0 — безопасный локальный анализ

Разрешено без отдельного апрува:

- читать код, миграции и vault;
- запускать локальный `rg`, `npm run lint`, `npm run build`, `npm test`;
- проверять имена env-переменных без вывода секретов;
- готовить SQL, планы, миграции и документацию.

### Level 1 — read-only внешние проверки

Требует явного апрува, если команда выходит в сеть:

- read-only запросы к Supabase;
- проверка списка таблиц, индексов, RLS-политик, миграций;
- проверка R2 bucket metadata без изменения объектов;
- проверка Vercel project/env/logs без деплоя.

Правило: read-only запросы не должны выбирать персональные данные пользователей без явной причины. Для аудита предпочтительны `count(*)`, `information_schema`, `pg_indexes`, `pg_policies`, агрегаты и sample без PII.

### Level 2 — управляемые изменения инфраструктуры

Всегда требует явного апрува:

- применение Supabase migration;
- изменение RLS policy;
- массовый update/upsert/delete;
- загрузка или удаление файлов в R2;
- изменение Vercel env;
- preview/production deploy.

Перед выполнением нужно показать:

1. что будет изменено;
2. как откатить;
3. какие проверки будут запущены после;
4. почему изменение нужно для B2B/value или архитектурной устойчивости.

### Level 3 — запрещено без отдельного ручного контроля владельца

Не выполнять автоматически:

- `DROP TABLE`, `TRUNCATE`, массовый `DELETE`;
- удаление bucket/object prefix в R2;
- rotate/delete production secrets;
- отключение RLS;
- выдача service role в frontend;
- изменение billing/plan/owner полей магазинов через клиентский flow;
- деплой в production без явной команды владельца.

## Рекомендованный доступ

Лучший баланс скорости и безопасности:

1. подключить Supabase MCP или Supabase CLI для read-only аудита и аккуратных миграций;
2. держать service role только в server-side scripts/API, никогда не в frontend;
3. завести отдельный dev/staging Supabase project перед опасными миграциями;
4. для production использовать миграции с dry-run/review, затем явный апрув;
5. R2 и Vercel подключать позже, когда БД-архитектура и RetailImport будут стабильны.

Если dev/staging отсутствует, production считать единственным источником истины и работать особенно осторожно: сначала SQL plan, затем backup/export critical tables, затем миграция.

## Архитектурный фокус

Перед расширением фич необходимо закрыть фундамент:

1. DB governance: проверить миграции, constraints, CASCADE, updated_at triggers, GIN/trigram indexes, RLS ownership.
2. Scaling: `scan_events` стратегия партицирования/архивации, serverless-safe rate limit, атомарные counters.
3. RetailImport: настоящий импорт прайс-листа как P0 для продажи магазинам.
4. Security: audit RPC, RLS, storage policies, API error leakage, service role boundaries.
5. Codebase maintainability: крупные экраны дробить только по мере работы, без дизайн-откатов и без переписывания всего UI.

## Правила для будущих ассистентов

- Всегда читать `docs/CONTEXT.md` в начале.
- Для специфичных задач делать RAG-запрос или читать профильный vault-файл.
- Не менять дизайн без разрешения владельца.
- Новый пользовательский текст добавлять через `useI18n` RU/KZ.
- Экраны покупателя держать внутри `/s/:storeSlug/`.
- Для БД-задач использовать Supabase/Postgres best practices и проверять RLS.
- Перед risky operation показывать план, rollback и verification.
- После значимых изменений обновлять `docs/CONTEXT.md`, vault и запускать `node scripts/embed-vault.mjs`.
