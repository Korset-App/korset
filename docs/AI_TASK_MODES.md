# KORSET — AI TASK MODES

> Обновлено: 2026-05-06.
> Роль файла: короткие рабочие режимы для Codex, OpenCode, Windsurf, Antigravity и других ИИ-агентов.
> Правила поведения остаются в `AGENTS.md`; быстрый проектный контекст — в `docs/CONTEXT.md`.
> Матрица skills/plugins/checks: `docs/AI_TOOLS_MATRIX.md`.

---

## 1. Universal Start

For any meaningful task:

1. Read `docs/CONTEXT.md`.
2. Identify the task mode below.
3. Inspect only the relevant code/docs first.
4. Query Vault only when deep project memory is useful.
5. Ask the owner only when guessing could affect behavior, data, design, security, auth, routing or product scope.

---

## 2. UI Mode

Use for screens, components, layout, mobile UX, visual polish and premium brand quality.

Read/check:
- relevant `src/screens/**` and `src/components/**`;
- related CSS;
- `src/locales/ru/**` and `src/locales/kz/**` for new text;
- `src/styles/theme.css` when colors/theme are involved;
- routes in `src/App.jsx` if navigation changes.

Rules:
- do not redesign broad surfaces without approval;
- preserve dark/light themes;
- no hardcoded core white/black surfaces;
- new text needs RU/KZ i18n;
- verify mobile and desktop layout when feasible.

Suggested checks:

```bash
npm run check:agent:ui
```

---

## 3. Bugfix Mode

Use for broken behavior, runtime errors, failed tests and regressions.

Flow:
1. Reproduce or localize the failure.
2. Find the smallest root cause.
3. Patch surgically.
4. Run targeted verification first.
5. Broaden checks only if the bug touched shared behavior.

Rules:
- do not rewrite adjacent systems unless root cause requires it;
- if documents and code disagree, trust verified code and update docs if needed;
- keep a short note in Vault only when the bug teaches future agents something durable.

Suggested checks:

```bash
npm run check:agent
```

---

## 4. Supabase / DB Mode

Use for Supabase, RLS, schema, migrations, storage, auth policies, import/data scripts and performance.

Read/check:
- relevant SQL/migrations in `supabase/`;
- all JS consumers of changed tables/functions;
- RLS/security assumptions;
- import/enrichment scripts;
- Vault notes for architecture/data decisions.

Rules:
- never weaken RLS to make a feature pass;
- never expose service-role keys to client code;
- prefer explicit constraints and indexes;
- ask before production data mutation or destructive migrations.

Suggested checks:

```bash
npm run check:agent
```

---

## 5. Architecture Mode

Use for cross-system design, refactors, data model decisions and product/technical direction.

Read/check:
- `docs/CONTEXT.md`;
- `docs/ARCHITECTURE.md`;
- relevant `docs/vault/architecture/**`;
- actual code entry points for the subsystem.

Rules:
- do not trust legacy docs blindly;
- separate current truth from historical context;
- document durable decisions in `docs/vault/decisions/`;
- update `docs/ARCHITECTURE.md` only for long-lived architecture changes.

Suggested checks:

```bash
npm run check:agent:docs
```

---

## 6. Memory Mode

Use for AGENTS/CONTEXT/ARCHITECTURE/ROADMAP/Vault changes.

Rules:
- `AGENTS.md` stays short and behavior-focused;
- `docs/CONTEXT.md` is fast-start current context;
- `docs/ARCHITECTURE.md` is a compact system map;
- `docs/ROADMAP_PILOT_V1.md` is current priorities and open decisions;
- detailed history goes to `docs/vault/changelog/`;
- durable rationale goes to `docs/vault/decisions/`;
- old docs should be marked or indexed, not blindly treated as truth.

Suggested checks:

```bash
npm run check:agent:docs
npm run memory:save
```

---

## 7. Release / Verification Mode

Use before claiming a substantial feature is done, before commit/PR, or before handoff to another agent.

Minimum:
- run checks matching the touched area;
- list changed files;
- list what was verified;
- list remaining risks honestly.

Suggested full check:

```bash
npm run check:agent:full
```

Use the full check when product code changed broadly. For docs-only work, `check:agent:docs` is enough.
