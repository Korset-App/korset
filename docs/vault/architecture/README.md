---
domain: architecture
subdomain: index
status: active
updated: 2026-05-06
---

# Architecture Vault Index

Use this folder for durable, detailed architecture notes that are too specific for `docs/ARCHITECTURE.md`.

## Active Maps

- `auth-system.md` and `auth-flow.md` — authentication, recovery and account-method behavior.
- `product-resolution.md` — product lookup, store overlay and fallback flow.
- `fit-check-engine.md` — deterministic safety model and AI boundaries.
- `retail-cabinet.md` — owner-facing B2B cabinet.
- `offline-resilience.md` — app shell, IndexedDB cache and pending scan queue.
- `ean-recovery-system.md` — unknown EAN recovery loop.
- `category-system.md` — catalog category model.
- `i18n-migration.md` — localization structure and migration notes.
- `assistant-memory-pipeline.md` — agent memory and Vault/RAG pipeline.
- `r2-cdn.md` — product image/CDN direction.

## Rules

- Keep `docs/ARCHITECTURE.md` as the short system map.
- Put subsystem details here.
- Add frontmatter with `domain`, `subdomain`, `status`, and `updated`.
- If a note becomes obsolete, mark `status: superseded` and link the replacement instead of deleting useful history.
