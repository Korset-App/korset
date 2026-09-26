# Codex workflow cleanup — 2026-09-26

Scope: development environment and memory entrypoints only. Product changes already
present in the working tree were preserved. No commit, push, deployment, database
write, key transmission, plugin installation or paid model call was performed.

## Changes

- Moved catalog-specific obligations verbatim from AGENTS into
  `knowledge/catalog-data-invariants.md`, with mandatory task-based loading.
- Reduced CONTEXT to a navigation guide; preserved its complete prior content in
  `2026-09-26-context-before-workflow-cleanup.md` beside this note.
- Replaced obsolete OpenCode/Azure cost guidance and broken documentation pointers.
- Made Vault query local by default; remote search is explicit. Fixed local metadata
  filters and stopped labeling local relevance scores as probability percentages.
- Made memory:save local validation by default; remote mutation needs --remote --apply.
- Added seven subprocess regression tests, including a network trap with synthetic keys.
- Exposed korset-check through .agents/skills, retained legacy editor pointer, removed
  unsafe broad cleanup instructions, and added a 6000-token project output budget.
- Added memory regression checks to check:agent:docs and RU/KZ validation to GitHub CI.

## Verification and limits

- check:agent:docs passed, including 7/7 memory tests and local syntax checks.
- memory:save passed locally; remote index explicitly not synchronized.
- Local query with active-status/domain filters returned the new workflow guide.
- RU/KZ validation passed: no missing, orphan or empty keys; 135 identical values
  and a skipped onboarding file were reported by the existing checker.
- No full product build or browser/pilot audit was required for these workflow edits.
- GitHub CLI authenticated; connector directory reported Supabase/Vercel/GitHub
  uninstalled, despite older enabled records in personal config.
- Shell Codex diagnostic runs in an isolated/restricted environment and does not
  establish host application authentication. Do not reset credentials based on it.

## Follow-up

Owner connection approval is needed for Supabase/Vercel tools. Use project-scoped
read-only Supabase access. GitHub already has a usable CLI route.
Remote index replacement ordering and provider/model identity still need repair
before a production sync. This task did not modify embed-vault or the database.
Jev remains an optional measured snippet-ranking experiment, not a product dependency
or a replacement for Codex. No real API evaluation or savings claim was made.

Pre-edit working copies of instructions are also in ignored scratch/workflow-audit/.
