# Память ассистента и Vault pipeline

> Связи: [[assistant-access-and-architecture-governance]] · [[architecture-decisions]] · [[2026-04-27-audit-sync]]

## Цель

Держать Codex в контексте Körset с минимальным расходом токенов: короткий `docs/CONTEXT.md` для старта чата и глубокий `docs/vault/` для RAG-поиска по необходимости.

## Как работает

1. В начале чата ассистент читает только `docs/CONTEXT.md`.
2. Если задача специфичная, ассистент делает точечный RAG-запрос через `node scripts/query-vault.mjs`.
3. В конце значимой сессии ассистент обновляет `docs/CONTEXT.md` и добавляет или правит релевантный markdown-файл в `docs/vault/`.
4. После этого запускается `npm run memory:save`, который обновляет embeddings через `scripts/embed-vault.mjs`.

## Почему не один большой markdown

Один большой файл быстро съедает контекстное окно. Vault + pgvector позволяет хранить много знаний, но доставать в чат только релевантные чанки.

## Правила экономии токенов

- `docs/CONTEXT.md` хранит только текущий фокус, статус и ближайшие задачи.
- Подробности живут в `docs/vault/architecture`, `docs/vault/decisions`, `docs/vault/knowledge`, `docs/vault/plans`.
- Шаблоны из `docs/vault/templates` используются только при создании новой памяти и не читаются каждый раз.
- Вся проектная память пишется на русском. Код и комментарии в коде могут быть на английском.
