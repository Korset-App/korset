# AGENTS.md - Körset Agent Instructions

This file is the primary project instruction set for AI coding agents working on Körset.
Keep it short, stable, and behavior-focused. Do not turn it into a changelog, roadmap, or architecture dump.

## 1. Communication

- Speak with the user in Russian only.
- Write code, identifiers, commit messages, and technical comments in English.
- The user may write long, informal, or uncertain messages. Extract the intent carefully and confirm only when needed.
- Be direct, honest, and useful. Do not flatter, over-agree, or hide uncertainty.

## 2. Project Snapshot

Körset is a mobile-first PWA for offline grocery stores in Kazakhstan.
Customers scan a barcode in a specific store and get a Fit-Check for allergies, halal status, diets, and product facts.

Business model: B2B2C. Stores pay for SaaS; shoppers use the consumer flow.
V1 scope: grocery stores only. Do not design for pharmacies, electronics, construction, alcohol/tobacco flows, or generic marketplaces unless the user explicitly changes scope.

Core stack:
- React 18 + Vite
- JavaScript, not TypeScript
- Vanilla CSS, not Tailwind
- Supabase: PostgreSQL, Auth, Storage, RLS
- Vercel Serverless
- OpenAI

## 3. Truthfulness And Pushback

- The user can be wrong, missing context, or working from outdated assumptions. Do not agree blindly.
- If a request is risky, outdated, technically incorrect, over-scoped, or bad for the product, say so clearly and propose a better path.
- The agent can also be wrong. If you notice your own mistake, admit it directly, explain the impact, and correct course.
- Do not invent missing facts. Inspect local context first; if the answer is still unclear and the decision matters, pause and ask.
- Prefer a small number of high-value questions over broad questionnaires.

## 4. Execution Style

- Think before coding. For non-trivial work, state assumptions, risks, and a short plan before editing.
- Small, safe fixes may be implemented directly when the intent is clear.
- Get approval before major UI redesigns, architecture changes, database/RLS changes, auth changes, data pipeline changes, product-scope changes, or anything with broad side effects.
- Keep changes surgical. Every changed line should trace back to the task.
- Match existing patterns and style, even if you would personally design them differently.
- Do not refactor adjacent code, rename things, reformat files, or remove old code unless required for the task.
- Do not add speculative abstractions, generic frameworks, or configurability that was not requested.
- Prefer professional, future-aware solutions, but do not over-engineer. Quality and simplicity must work together.

## 5. When To Stop And Ask

Stop and ask before editing when:
- Requirements are ambiguous and guessing could affect behavior, data, design, security, payments, auth, routing, or business logic.
- Local files contradict the user's request or each other.
- The task seems to require changing product scope or business assumptions.
- You cannot verify a critical fact from local context or current official docs.
- Continuing would require destructive actions, deleting data, resetting git state, or manual production deploys.

Do not stop for trivial details that can be safely inferred from existing code.

## 6. Memory And Context System

The project uses layered memory. Keep each layer in its role.

- `AGENTS.md`: stable agent behavior rules. Keep concise.
- `docs/CONTEXT.md`: fast-start project context. It should be fuller than this file, but not an archive. Keep current focus, working status, critical constraints, and links to deeper docs.
- `docs/ARCHITECTURE.md`: deep system map and long-lived architecture.
- `docs/ROADMAP_PILOT_V1.md`: current product roadmap and launch priorities.
- `docs/AI_TASK_MODES.md`: task-specific workflows for UI, bugfix, DB, architecture, memory, and release work.
- `docs/AI_TOOLS_MATRIX.md`: which skills, plugins, MCP tools, and checks to use for each task type.
- `docs/PROMPT_STARTERS.md`: reusable short prompts for the owner.
- `docs/AI_COLLAB_PROTOCOL.md`: multi-agent workflow.
- `docs/vault/`: detailed memory, decisions, research, plans, operations, and changelog notes for RAG.

Start of meaningful work:
1. Read `docs/CONTEXT.md`.
2. Use targeted file search for the task area.
3. Query Vault only when project memory is needed:
   `node scripts/query-vault.mjs "query" --domain architecture`
   or use `knowledge`, `plans`, `decisions`, `operations`, `changelog` as appropriate.
4. Do not read the whole repository just to "understand everything". Build the smallest sufficient map for the task.

Deep work exception:
- For broad architecture, audit, product strategy, or cross-system refactors, read `docs/ARCHITECTURE.md` and relevant Vault files after `docs/CONTEXT.md`.

Before the final response after meaningful work:
- Update `docs/CONTEXT.md` only with current, durable, fast-start information.
- Add or update the relevant Vault note when work changes architecture, product direction, data model, important UX patterns, business logic, decisions, or future handoff context.
- Run `npm run memory:save` after Vault changes when credentials/network are available.
- Do not let `docs/CONTEXT.md` grow into a changelog. Move details to Vault and leave links/summaries.

## 7. Multi-Agent Coordination

The user may work in Codex, OpenCode, Windsurf, Antigravity, and Claude-like tools at the same time.

- Assume other agents or the user may have changed files.
- Check local state before editing when relevant.
- Never revert changes you did not make unless the user explicitly asks.
- If parallel work may collide, document handoff notes clearly: changed files, decisions, verification, and next steps.
- Keep memory fresh enough that another agent can continue without following stale context.

## 8. UI And Product Rules

- Consumer screens must live under `/s/:storeSlug/`.
- V1 is mobile-first and store-context-first.
- Evaluate product decisions through B2B value: does this help sell or retain store subscriptions?
- Do not redesign existing UI without approval.
- Maintain premium, serious-brand quality. Avoid cheap, generic, or decorative UI choices.
- Support both dark and light themes.
- Use existing CSS variables for text, backgrounds, borders, glass surfaces, and brand colors.
- Do not hardcode `#fff`, `#000`, or raw white/black transparent backgrounds for core UI surfaces or text.
- New user-facing text must use `useI18n` with RU and KZ coverage.
- Avatars must use `<ProfileAvatar />`.
- Use high-quality SVG or existing icon patterns. Material Symbols are acceptable for simple system icons when consistent with the current UI.

## 9. Code Comments

- Do not add comments by default.
- Add a short English comment only when it explains a non-obvious invariant, security concern, browser/platform workaround, migration risk, or AI-handoff-relevant decision.
- Do not add comments that merely restate the code.
- Prefer clear names and small functions over explanatory comments.

## 10. Data, Auth, And Supabase Safety

- Treat Supabase, RLS, auth, and data migrations as high-risk areas.
- Prefer explicit constraints, indexes, and tests for data integrity changes.
- Do not weaken RLS or security checks to make a feature pass.
- Do not expose service-role keys or secrets to the client.
- For DB/API changes, check all consumers: screens, utilities, tests, RLS policies, migrations, seed/import scripts, and Vault docs.

## 11. Deployment Safety

- Do not run manual `vercel --prod`.
- Production deploys should happen from the owner's GitHub/Vercel flow after git push.
- Be careful with commands that mutate remote data, production data, auth settings, storage, or deployments. Ask first unless the user explicitly requested the exact action.

## 12. Verification

Choose verification based on risk and touched areas.

Common checks:
- `npm run check:agent:docs` for docs/memory/script syntax checks
- `npm run check:agent` for quick default verification
- `npm run check:agent:ui` for UI/i18n/lint/build checks
- `npm run check:agent:full` for broad pre-handoff verification
- `npm run build`
- `npm run lint`
- `npm run test:unit`
- `node scripts/check-i18n.mjs` when text or i18n changes
- Browser/Playwright smoke checks for UI flows
- Targeted script or test for data pipelines and domain logic

Before claiming work is done:
- Run the relevant checks when feasible.
- If a check cannot be run, say why.
- Do not present unverified work as verified.

## 13. Preferred User Prompt Style

The user may give short prompts. The agent should expand them into a professional workflow.

For example, if the user says "work on the home screen":
1. Read current context.
2. Inspect the relevant screen, styles, i18n, and routes.
3. Ask only the key product/design questions.
4. Propose a plan.
5. Wait for approval before major UI changes.

For a small bug:
1. Reproduce or locate the cause.
2. Fix surgically.
3. Verify.
4. Update memory only if future agents need the knowledge.

## 14. What Not To Store Here

Do not add the following to `AGENTS.md`:
- Session changelogs
- Old audits and numeric project scores
- Full architecture explanations
- Database statistics snapshots
- Long command catalogs
- Tool lists that are specific to one IDE
- Temporary plans or completed task history

Put those in `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP_PILOT_V1.md`, or `docs/vault/` depending on their role.
