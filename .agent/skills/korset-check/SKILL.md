---
name: korset-check
description: Run verification and quality checks for Körset based on task risk level (quick, ui, i18n, unit, full).
---

# Körset Verification Skill

Select and run the appropriate verification suite based on the modified files and risk level.

## Check Suites

| Mode | Command | Duration | When to use |
| --- | --- | --- | --- |
| **quick** | `npm run check:agent` | ~3s | Syntax check, Vault scripts check, unit tests (565 tests) |
| **ui** | `npm run check:agent:ui` | ~25s | i18n validation, ESLint (`src/`), Vite build, PWA service worker |
| **i18n** | `node scripts/check-i18n.mjs` | ~1s | When touching `src/locales/{ru,kz}/*.json` or user-facing strings |
| **unit** | `npm run test:unit` | ~3s | Domain logic, data normalizers, utilities, helpers |
| **docs** | `npm run check:agent:docs` | ~2s | Vault scripts syntax, memory docs consistency |
| **full** | `npm run check:agent:full` | ~30s | Pre-handoff, before git commits touching both frontend and backend |

## Guidelines

- Never present unverified work as verified.
- For pure copy/UI changes, `check:agent:ui` or `check-i18n` is sufficient.
- For domain/utility changes, run `npm run test:unit`.
- If a check fails, diagnose root cause and patch surgically.
