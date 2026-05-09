# Multi-LLM Coordination — 2026-04-25

> Связи: [[assistant-access-and-architecture-governance]] · [[assistant-memory-pipeline]]

## Что добавлено

- `docs/AI_COLLAB_PROTOCOL.md` — минимальный протокол совместной работы Codex, GLM 5.1 и Kimi 2.6.
- `docs/AI_TASK_BOARD.md` — живая доска задач с `task_id`, владельцем, статусом и write-zone.
- `docs/AI_HANDOFF.md` — готовые промпты для трёх моделей и короткий шаблон handoff.

## Почему так

Проект уже достаточно большой, а backlog распылён между `docs/CONTEXT.md`, roadmap, audit и vault-планами. Полноценная многомодельная координация без write-zone и task board приведёт к конфликтам по файлам, дублированию и потере времени на reconciliation.

При этом отдельные большие lock/session-файлы пока избыточны. Поэтому выбран минимальный слой координации поверх уже существующих `docs/CONTEXT.md` и vault:

- 1 файл правил,
- 1 файл живых задач,
- 1 файл handoff/prompts.

## Рекомендуемое распределение ролей

- **Codex** — интегратор, проверки, связующие изменения, project memory.
- **GLM 5.1** — БД, Data Moat, миграции, performance/scaling, import/data flows.
- **Kimi 2.6** — UI/UX, retail dashboard polish, landing, premium mobile surfaces.

## Рабочее правило

Максимум 2 активных писателя одновременно. Третья модель либо исследует, либо ревьюит, либо готовит следующий изолированный блок.

## Следующий практический шаг

Первый реальный запуск этой схемы: назначить одну активную пару задач из `docs/AI_TASK_BOARD.md` и заставить все модели читать `docs/CONTEXT.md`, `docs/AI_COLLAB_PROTOCOL.md`, `docs/AI_TASK_BOARD.md` и `docs/AI_HANDOFF.md` перед стартом.
