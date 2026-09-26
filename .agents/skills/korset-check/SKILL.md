---
name: korset-check
description: Select and run the existing Körset verification commands after project changes; report actual evidence and pre-existing failures.
---

# Körset checks

Select by touched behavior, not by habit. Do not promise fixed durations or test counts.

| Change | Command |
| --- | --- |
| Docs/instructions | npm run check:agent:docs |
| Memory tools | node --test tests/unit/vaultWorkflow.test.mjs |
| Domain logic/helpers | npm run test:unit |
| UI/CSS/localization | npm run check:agent:ui |
| Combined release handoff | npm run check:agent:full |

For changed screens also exercise the affected browser flow in the relevant store,
including RU/KZ and both themes when impacted. Script checks do not prove live pilot readiness.
The docs command checks syntax and diff whitespace; it is not a semantic documentation audit.
After Vault edits run npm run memory:save (local only). Remote sync requires explicit
external-processing/write authorization; never run it as routine verification.

Inspect pre-existing dirty files before attributing a failure to your changes.
Report command, result, and any unverified behavior. Repeat only after relevant changes
or when a failure remains unresolved. Do not apply database migrations or deploy as a test.
