---
domain: knowledge
subdomain: agent-workflow
updated: 2026-09-26
---

# Agent Operating Rules — Extended Reference

Full version of the agent rules. The short, always-loaded version lives in `AGENTS.md`.

`AGENTS.md` is always-loaded guidance; keep it concise and move task-specific detail into linked references.
Everything below was moved here on 2026-09-17 because it is either generic agent hygiene
that modern models already follow, or detail that is only needed occasionally and can be
retrieved on demand.

Query this file with:
`node scripts/query-vault.mjs "agent rules ..." --domain knowledge`

## Why the split exists

Two independent reasons, both real:

1. **Cost.** Long instructions consume context. Exact billed usage depends on model,
   caching and execution mode; do not infer a fixed per-turn price from file size.
2. **Quality.** Long instruction files dilute attention. A short file where every line
   is load-bearing gets followed more reliably than a long file where most lines are
   boilerplate the model would have done anyway.

Reason 2 outlives reason 1. Even when tokens are cheap, keep `AGENTS.md` short.

## Truthfulness and pushback (expanded)

- The user can be wrong, missing context, or working from outdated assumptions.
  Do not agree blindly.
- If a request is risky, outdated, technically incorrect, over-scoped, or bad for the
  product, say so clearly and propose a better path.
- The agent can also be wrong. If you notice your own mistake, admit it directly,
  explain the impact, and correct course.
- Do not invent missing facts. Inspect local context first; if the answer is still
  unclear and the decision matters, pause and ask.
- Prefer a small number of high-value questions over broad questionnaires.

## Execution style (expanded)

- Think before coding. For non-trivial work, state assumptions, risks, and a short plan
  before editing.
- Small, safe fixes may be implemented directly when the intent is clear.
- Keep changes surgical. Every changed line should trace back to the task.
- Match existing patterns and style, even if you would personally design them
  differently.
- Do not refactor adjacent code, rename things, reformat files, or remove old code
  unless required for the task.
- Do not add speculative abstractions, generic frameworks, or configurability that was
  not requested.
- Prefer professional, future-aware solutions, but do not over-engineer. Quality and
## Thorough Planning & Anti-Rush Standard (Осознанное проектирование и запрет скорострельности)

- **Запрет скорострельности и поспешных действий**: Категорически запрещено выдавать поверхностные решения наспех. Прежде чем приступать к коду, агент обязан глубоко обдумать решение со всех сторон: как продуктовый маркетолог (польза, ценность, отсутствие мусора/шума) и как ведущий инженер (производительность, надежность, архитектура).
- **Обязательный поэтапный план**: Если задача объемная или многосоставная, агент ОБЯЗАН СНАЧАЛА построить полноценный план, разбить его на прозрачные логические этапы с контрольными точками и показать пользователю целостную картину.
- **Согласование до написания кода**: Сформулировать архитектуру и ключевые развилки, задать уточняющие вопросы и дождаться утверждения плана пользователем, прежде чем вносить масштабные правки вне уже согласованного объёма. Явное разрешение пользователя на безопасную реализацию достаточно; повторно его не запрашивать. Двигаться поэтапно, проверяя результат.
- **Продуктовая планка качества**: Каждый элемент интерфейса должен быть реально полезен и обоснован, не создавать визуальный или текстовый шум, соответствовать премиальному уровню ведущих продуктов (Kaspi, Wolt, Apple) и нести прямую B2B2C ценность.

## When to stop and ask (expanded)

Stop and ask before editing when:

- Requirements are ambiguous and guessing could affect behavior, data, design,
  security, payments, auth, routing, or business logic.
- Conflicting local files leave a consequential decision unresolved; explicit current user instructions take priority.
- The task seems to require changing product scope or business assumptions.
- You cannot verify a critical fact from local context or current official docs.
- Continuing would require destructive actions, deleting data, resetting git state,
  or manual production deploys.

Do not stop for trivial details that can be safely inferred from existing code.

## Multi-agent coordination

The user may work in Codex, OpenCode, Windsurf, Antigravity, and Claude-like tools at
the same time.

- Assume other agents or the user may have changed files.
- Check local state before editing when relevant.
- Never revert changes you did not make unless the user explicitly asks.
- If parallel work may collide, document handoff notes clearly: changed files,
  decisions, verification, and next steps.
- Keep memory fresh enough that another agent can continue without following stale
  context.

## Memory layer responsibilities

| Layer | Role |
| --- | --- |
| `AGENTS.md` | Stable agent behavior rules. Always loaded. Keep concise; link task-specific rules. |
| `docs/CONTEXT.md` | Fast-start project context. Current focus, working status, critical constraints, links to deeper docs. Under 250 lines. |
| `docs/ARCHITECTURE.md` | Deep system map and long-lived architecture. |
| `docs/ROADMAP_PILOT_V1.md` | Current product roadmap and launch priorities. |
| `docs/vault/knowledge/model-routing-and-cost-control.md` | Current workflow, skills, integrations, memory modes and Jev decision. |
| `docs/vault/` | Detailed memory, decisions, research, plans, operations, changelog notes for RAG. |

### CONTEXT.md discipline

- **Never** add changelog entries, import logs, stage-by-stage completions, or
  vault-file summaries to `CONTEXT.md`.
- Before writing a line to `CONTEXT.md`, ask: "Would a new agent make a mistake without
  this line?" If no, do not add it.
- Session results, operation histories, and detailed status belong in
  `docs/vault/changelog/`, never in `CONTEXT.md`.

### Where things belong

| Content | Destination |
| --- | --- |
| Session changelogs | `docs/vault/changelog/` |
| Architecture details | `docs/vault/architecture/` or `docs/ARCHITECTURE.md` |
| Plans and audits | `docs/vault/plans/` |
| Decisions | `docs/vault/decisions/` |
| Tool lists and task modes | `docs/vault/knowledge/model-routing-and-cost-control.md` |

Do **not** put in `AGENTS.md`: session changelogs, old audits, numeric project scores,
full architecture explanations, database statistics snapshots, long command catalogs,
IDE-specific tool lists, temporary plans, completed task history.

### Deep work exception

For broad architecture, audit, product strategy, or cross-system refactors, read
`docs/ARCHITECTURE.md` and relevant vault files after `docs/CONTEXT.md`.

### End-of-work memory routine

- Update `docs/CONTEXT.md` only with current, durable, fast-start information.
- Add or update the relevant vault note when work changes architecture, product
  direction, data model, important UX patterns, business logic, decisions, or future
  handoff context.
- Run `npm run memory:save` after vault changes for local validation. Remote indexing
  requires separate authorization and explicit `--remote --apply`; never imply it ran locally.

## Verification catalog

| Command | Use |
| --- | --- |
| `npm run check:agent` | Quick default verification |
| `npm run check:agent:docs` | Docs / memory / script syntax checks |
| `npm run check:agent:i18n` | i18n checks |
| `npm run check:agent:ui` | UI / i18n / lint / build checks |
| `npm run check:agent:full` | Broad pre-handoff verification |
| `npm run build` | Production build |
| `npm run lint` | ESLint over `src` |
| `npm run test:unit` | Node unit tests |
| `npm test` | Playwright suite |
| `node scripts/check-i18n.mjs` | When text or i18n changes |
| `npm run check:ai:qa` | AI quality gate |

Also: browser/Playwright smoke checks for UI flows; targeted scripts or tests for data
pipelines and domain logic.

Rules: choose verification based on risk and touched areas. Run the relevant checks when
feasible. If a check cannot be run, say why. Never present unverified work as verified.

## Preferred user prompt style

The user gives short prompts. The agent expands them into a professional workflow.

Example — "work on the home screen":

1. Read current context.
2. Inspect the relevant screen, styles, i18n, and routes.
3. Ask only the key product/design questions.
4. Propose a plan.
5. Wait for approval before major UI changes.

Example — a small bug:

1. Reproduce or locate the cause.
2. Fix surgically.
3. Verify.
4. Update memory only if future agents need the knowledge.
