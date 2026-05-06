# KORSET — AI TOOLS MATRIX

> Обновлено: 2026-05-06.
> Роль файла: какой skill/plugin/tool использовать для какого типа задачи.
> Не загружать все инструменты всегда. Выбирать минимальный набор под задачу.

---

## 1. Principle

Best agent performance comes from targeted tool use:

```text
task type -> task mode -> relevant skill/plugin -> focused context -> verification
```

Do not use tools just because they exist. Every tool call should reduce uncertainty, improve quality, verify behavior, or safely perform a needed action.

---

## 2. Default Tool Choice

| Task | Best agent | Skills / plugins | Must check |
| --- | --- | --- | --- |
| UI screen/component | Windsurf or Codex | `frontend-design`, `web-design-guidelines`, `sleek-design-mobile-apps`, Browser Use | i18n, theme, responsive layout, browser smoke |
| React performance/refactor | Codex | `vercel-react-best-practices`, `verification-before-completion` | lint, build, targeted tests |
| Bug/runtime error | Codex or OpenCode | `systematic-debugging`, Browser Use if UI | reproduce, root cause, targeted verification |
| Supabase Auth | Codex or Antigravity | `supabase`, `systematic-debugging` | redirect URLs, RLS, client/server separation |
| DB/RLS/migrations | Codex or Antigravity | `supabase`, `supabase-postgres-best-practices` | migration review, RLS safety, consumers |
| Data import / Data Moat | Antigravity or Codex | `supabase-postgres-best-practices`, `systematic-debugging` | parser tests, DB constraints, unknown EAN flow |
| AI/RAG/memory | Codex | Vault scripts, `openai-docs` only for OpenAI API questions | `check:agent:docs`, `memory:save`, query smoke |
| Deployment/CI | Codex | GitHub plugin, Vercel plugin | CI checks, preview/build logs, no manual prod deploy |
| Design system/Figma | Windsurf or Codex | Figma plugin, `frontend-design` | compare design/code, responsive visual QA |
| Docs/pitch/import sheets | Codex | Documents, Spreadsheets | render/format verification |

---

## 3. Skills Policy

Use skills on demand:

| Skill | Use when | Do not use for |
| --- | --- | --- |
| `supabase` | Supabase Auth, Storage, RLS, client/server integration | pure UI copy/style changes |
| `supabase-postgres-best-practices` | SQL, indexes, constraints, performance, migrations | frontend-only work |
| `frontend-design` | new/polished UI, premium screens, visual direction | small non-visual bugfixes |
| `web-design-guidelines` | design review, accessibility, spacing, typography | backend/data work |
| `sleek-design-mobile-apps` | mobile-first PWA screens and flows | desktop-only docs |
| `vercel-react-best-practices` | React component architecture/performance | SQL/RLS |
| `systematic-debugging` | bugs, failures, unexpected behavior | simple planned edits |
| `test-driven-development` | risky feature/bugfix where tests help | throwaway docs edits |
| `webapp-testing` | local browser/PWA interaction | non-UI scripts |
| `verification-before-completion` | before claiming major work is done | early exploration |
| `openai-docs` | current OpenAI API/model/docs questions | general project memory |

Rule: if a skill is loaded, apply it narrowly and summarize the effect. Do not paste large skill content into docs or chat.

---

## 4. Plugin Policy

| Plugin | Best use | Approval / caution |
| --- | --- | --- |
| GitHub | PRs, CI, issues, review threads, checks, publishing changes | ask before pushing/merging unless explicitly requested |
| Vercel | previews, logs, env, deployments, domains | never manual `vercel --prod` without explicit owner request |
| Figma | design system, screen translation, design QA | avoid replacing code truth with design guesswork |
| Browser Use | local browser verification, screenshots, interaction checks | prefer for frontend verification after UI changes |
| Documents | `.docx` pitch docs, specs, formatted docs | render/verify before final |
| Spreadsheets | CSV/XLS/XLSX import tests, price lists, reports | verify formulas/formatting if generated |

---

## 5. MCP / External Context

Use external context when local context is insufficient or time-sensitive:

- Official docs for current library/API behavior.
- GitHub search for real implementation patterns.
- Browser tools for local UI verification.
- Vercel/GitHub tools for live CI/deploy information.

Rules:
- Prefer official docs for technical/API truth.
- Do not browse randomly when local code answers the question.
- Do not use production-changing tools without owner approval.
- If internet/tool access fails, say what was not verified.

---

## 6. RLS / Production Safety

High-risk actions require explicit owner approval:

- destructive SQL;
- production data mutation;
- weakening RLS;
- service-role usage beyond local scripts/server-only contexts;
- changing auth redirect behavior;
- deleting storage buckets or files;
- production deploy/manual promotion;
- rotating secrets.

Agent default is read/analyze/plan first, then ask.

Never:
- expose service-role keys in client code;
- bypass RLS with client-side tricks;
- make medical/product-safety claims from unknown data;
- silently mutate live data to “fix” a demo.

---

## 7. Recommended Owner Shortcuts

Use these short phrases to activate the right workflow:

```text
UI-задача: ...
Багфикс: ...
Supabase-задача: ...
Архитектурная задача: ...
Memory-задача: ...
Release-check: ...
Handoff: ...
```

Full templates: `docs/PROMPT_STARTERS.md`.

---

## 8. Verification Matrix

| Touched area | Minimum check |
| --- | --- |
| Docs / agent memory / scripts syntax | `npm run check:agent:docs` |
| Small JS logic | `npm run check:agent` or targeted unit test |
| i18n text | `npm run check:agent:i18n` |
| UI screens/components | `npm run check:agent:ui` plus browser smoke when feasible |
| Broad product code | `npm run check:agent:full` |
| Vault docs | `npm run memory:save` |
| Query-vault changes | `node scripts/query-vault.mjs "...query..." --domain ... --status active` |

Use heavier checks only when the risk justifies the cost.

---

## 9. What To Install / Enable Manually

Highest value for this project:

1. GitHub connector/plugin for PRs, CI and review.
2. Vercel connector/plugin for preview logs, env and deployments.
3. Figma connector/plugin for design system and premium UI work.
4. Browser automation/plugin for local visual verification.
5. Supabase MCP/connector if available, but only with strict read/approval boundaries.

Do not install broad tools that are not tied to a real workflow.

---

## 10. How To Maintain This File

Update when:
- a new tool becomes part of the normal workflow;
- a tool proves risky/noisy and needs limits;
- a new task category appears;
- verification commands change.

Do not add:
- long plugin manuals;
- temporary experiments;
- credentials;
- model hype or benchmark notes.
