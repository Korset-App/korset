---
domain: changelog
subdomain: agent-memory
status: active
updated: 2026-05-06
related: [[assistant-memory-pipeline]] · [[assistant-access-and-architecture-governance]]
---

# 2026-05-06 - Agent and memory system normalization

## Summary

The Körset project agent instruction system was redesigned to reduce token waste, stale context, and multi-agent confusion across Codex, OpenCode, Windsurf, Antigravity, and Claude-like tools.

## AGENTS.md rewrite

`AGENTS.md` is now the primary compact English rule file for AI coding agents.

Key decisions:
- User communication must remain Russian.
- Code, identifiers, commit messages, and technical comments remain English.
- The agent must not blindly agree with the user; it should push back when requests are risky, outdated, or technically wrong.
- The agent must openly admit its own mistakes and correct course.
- Small safe fixes may be direct, but major UI, DB/RLS, auth, architecture, data pipeline, or product-scope changes need plan and approval.
- Code comments are not added by default. Only short English comments are allowed for non-obvious invariants, security concerns, browser/platform workarounds, migration risks, or AI-handoff-relevant decisions.
- `AGENTS.md` must not become a changelog, roadmap, or architecture dump.

## CONTEXT.md normalization

`docs/CONTEXT.md` was converted from a long session archive into a fast-start project context.

New role:
- product overview;
- current stack and repo map;
- routes;
- what currently works;
- critical rules summary;
- current focus;
- latest durable status;
- memory-system map;
- verification cheatsheet;
- links to deeper docs;
- known memory cleanup backlog.

Moved-out principle:
- Long session logs, old DB snapshots, detailed audit tables, and completed task histories belong in Vault or architecture/roadmap docs, not in `docs/CONTEXT.md`.

## Second-pass correction

After owner feedback, `docs/CONTEXT.md` was reviewed against key code entry points instead of relying only on existing docs.

Files checked at a high level:
- `src/App.jsx`
- `src/screens/AuthScreen.jsx`
- `src/screens/AccountScreen.jsx`
- `src/screens/AlternativesScreen.jsx`
- `src/screens/ProductScreen.jsx`
- `src/screens/CatalogScreen.jsx`
- `src/contexts/StoreContext.jsx`
- `src/utils/retailImport.js`
- `src/utils/offlineDB.js`
- `src/i18n/*`
- `api/ai.js`

Corrections made:
- `docs/CONTEXT.md` was switched back to Russian so the owner can read it comfortably and agents are less likely to drift into English replies.
- The route map now reflects the actual `src/App.jsx` routes, including service screens, AI routes, product alternatives/AI/compare routes, and retail child routes.
- Auth wording now matches code: AuthScreen has password and email-code tabs; phone/WhatsApp auth UI was removed, while AccountScreen can still show an existing `user.phone`.
- Retail wording now separates Dashboard, Products, Import, Settings/QR, and EAN Recovery.
- `AlternativesScreen.jsx` is explicitly marked as needing verification/fix because code currently calls `useLocalName(product)` before `product` is declared and still has old hardcoded colors.

## Latest auth cleanup preserved

Before normalization, `docs/CONTEXT.md` contained detailed notes from the latest auth audit and cleanup. Durable facts kept in the new fast context:
- dead phone/SMS code was removed from AuthScreen;
- email/password, email OTP, Google OAuth, password recovery, and linked-method UI remain important;
- shared auth components include `AuthBackground`, `PasswordRules`, `AuthAlert`, and `GoogleLogo`;
- auth hardcoded colors were moved toward CSS variables;
- latest reported checks: build OK, lint 0 errors with existing warnings, i18n PASS.

Detailed implementation history can be recovered from git if needed; future session-level auth details should be stored in dated Vault changelog files.

## Architecture and roadmap normalization

`docs/ARCHITECTURE.md` was rewritten from a mixed master-document/archive into a compact Russian architecture map.

New role:
- system boundaries;
- current stack;
- route map;
- core data model;
- product resolution and Fit-Check principles;
- AI/RAG boundaries;
- auth, retail, offline, UI/i18n and operations map;
- known fragile areas.

The old long-form details were not copied back into the fast architecture file. Durable details should live in subsystem Vault notes.

`docs/ROADMAP_PILOT_V1.md` was rewritten from an old deadline/dual-agent phased plan into a current roadmap.

New role:
- P0 current launch blockers;
- P1 next improvements;
- frozen V1 scope;
- open owner decisions;
- links to deeper plans.

Old deadlines and model-specific agent assignments are now treated as historical context, not current instructions.

## Vault indexes

README indexes were added for:
- `docs/vault/architecture/`
- `docs/vault/plans/`
- `docs/vault/changelog/`
- `docs/vault/decisions/`

Purpose:
- make folder roles obvious to agents;
- warn that older plans can be legacy;
- reduce the need to load oversized files by default;
- give RAG better high-level anchors.

## Embed pipeline fix

`scripts/embed-vault.mjs` now:
- ignores `.obsidian`;
- extracts domain/subdomain with a slash-agnostic path splitter, so Windows paths and normalized vault paths behave consistently;
- stores optional `status`, `topic`, and `updated` frontmatter fields in chunk metadata.

This improves future filtering/search without deleting legacy chunks by status yet.

## Remaining memory-system backlog

- Gradually add frontmatter/status metadata to older Vault files when they are touched.
- Split or index oversized legacy changelog/plan files if they keep polluting RAG results.
- Continue verifying architecture Vault notes against real code before relying on them for implementation.

## Agent optimization layer

The project gained a lightweight agent productivity layer:
- `docs/AI_TASK_MODES.md` — task modes for UI, bugfix, Supabase/DB, architecture, memory and release work.
- `docs/AI_TOOLS_MATRIX.md` — task-to-skill/plugin/MCP/check matrix.
- `docs/PROMPT_STARTERS.md` — short owner prompts that expand into proper agent workflows.
- `docs/AI_HANDOFF.md` — standard handoff template for parallel agents.
- `docs/AI_TASK_BOARD.md` — minimal task board for multi-agent write-zone coordination.
- `docs/AI_COLLAB_PROTOCOL.md` — updated away from old model-specific roles toward Codex, OpenCode, Windsurf and Antigravity.
- `scripts/agent-check.mjs` — shared verification runner.

New npm checks:
- `npm run check:agent:docs`
- `npm run check:agent`
- `npm run check:agent:i18n`
- `npm run check:agent:ui`
- `npm run check:agent:full`

`scripts/query-vault.mjs` now supports:
- `--status`
- `--source`
- `--updated-after`

This makes the Vault more controllable for agents and reduces accidental reliance on stale memory.
