---
domain: knowledge
subdomain: agent-workflow
status: active
updated: 2026-09-26
---

# Model routing and cost control

Canonical daily guide: `docs/DEVELOPMENT.md`. Read it for task/model examples,
internal Jev usage, editor behavior and checks. Shared behavior is in `AGENTS.md`.

Project Codex defaults: Sol/medium, Luna/low helpers, maximum two helpers, 4000-token
tool-output budget. Explicit task model overrides still win. 52 unrelated or duplicate
skill entries were disabled through the local skills/config/write API and confirmed
with enabled=false by skills/list after plugin discovery; files/plugins are retained.
The already-open task can retain its initial catalog. Settings are user-wide;
the original user configuration has a sibling .before-workflow-skills backup.
Plugin cache paths are version-specific and need review after plugin upgrades.

The directory now reports GitHub, Supabase and Vercel installed. Supabase tools are
callable. Live read-only checks confirmed access to GitHub Korset-App/korset, the Supabase Korset project
and Vercel korset project after the owner reauthorized its team scope.
Do not install duplicate MCP connections merely because a plugin is already present.

Memory is local-first. `memory:save` validates locally; query `--remote` opts into
external processing, save `--remote --apply` opts into remote index writes, subject
to user authorization. Markdown is the source of truth, not the remote index.

Remote index limitations remain: delete-before-replacement, hashes without model or
metadata identity, and provider fallback across incompatible vector spaces. No remote
sync/repair was performed. These issues are separate from internal Jev setup.

Jev helper: `scripts/jev-workflow.mjs`, shared skill: `.agents/skills/korset-workflow`.
Offline tests cover fixed endpoint, bounded inputs, output validation and explicit
execution. One authorized synthetic live request succeeded: correct choice, confidence
0.98, 336 input and 40 output tokens. Savings against Astra are not yet measured.
For Luna and trivial decisions, skip Jev; it does not replace coding or reasoning.

Full local verification now includes offline navigation against the production build.
CI installs Chromium and runs that test too. Lint fails new warnings by file/rule and
all errors; existing warning budgets may shrink, not grow merely to pass a check.
Work packages and safe quarantine are recorded in docs/WORKING_CHANGES.md.

Earlier audit: `docs/vault/changelog/2026-09-26-codex-workflow-cleanup.md`.
