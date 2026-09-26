# Focused agent optimization

User requested concrete cost controls, internal Jev, model routing and shared editor behavior.

- Project Codex: gpt-6-sol/medium; helper default gpt-6-luna/low;
  max two concurrent helpers; retained tool output 4000 tokens.
- 52 unrelated/duplicate skill entries disabled for this project without deleting
  files. Vercel plugin retained with platform-relevant skills; duplicate standalone
  Supabase skills disabled in favor of the installed plugin.
- Shared korset-workflow skill in .agents/skills with legacy .agent entrypoint.
  The old TypeSafe product-oriented skill now points to internal workflow only.
- Added scripts/jev-workflow.mjs: validates bounded choice batches locally by default;
  explicit --execute, official endpoint, existing key, timeout, no retries or actions.
- OpenCode: removed undocumented tool_output/tail_turns options, enabled prune,
  retained existing model/provider and permission configuration.
- AGENTS model routing and docs/DEVELOPMENT.md provide concrete project examples.
  Antigravity current docs support AGENTS.md; editor model selection remains manual.

Verified: check:agent:docs passes, 7 memory + 5 Jev tests; local Jev example passes;
Codex debug prompt-input succeeds both sandboxed and on host, discovers new workflow.
Host diagnostic does not replace desktop restart/skill-list verification.
GitHub/Supabase/Vercel installation confirmed through plugin directory.
No live Jev call performed: one synthetic request awaits explicit spending approval.
OpenCode/Antigravity application sessions and Vercel project access not exercised.
No production writes, deployment, extra provider subscription or model benchmark.
Backups and disabled-skill inventory: ignored scratch/workflow-audit/.
