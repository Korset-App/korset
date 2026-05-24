# Fit-Check Pilot Hardening

Date: 2026-05-24
Domain: changelog
Status: active

## Summary

Hardened the core Fit-Check flow before pilot demos. The work focused on preserving the intended 4-level verdict model and closing gaps between visible profile preferences, deterministic product checks, alternatives, compare, and AI safety metadata.

## Changes

- Added shared `src/domain/product/fitVerdict.js` for stable 4-level Fit-Check badge metadata: `safe`, `caution`, `warning`, `danger`.
- ProductScreen, CompareScreen, and AlternativesScreen now preserve warning/caution verdicts instead of collapsing them into a binary "not fit" state through legacy `fits`.
- Alternatives profile reranking now marks warning/caution candidates as `check`, not `avoid`; only `danger` stays avoid.
- Fit-Check now evaluates visible diet goals more honestly:
  - `sugar_free` warns on sugar tags, sugar-like ingredients, or sugar above 5 g/100 g;
  - `gluten_free` warns on gluten allergens/tags/ingredient matches;
  - `vegetarian` warns on meat, fish, and seafood signals.
- AI safety contract now detects profile allergen matches from ingredient text, not only structured `allergens[]`.
- Added RU/KZ shared Fit verdict labels for non-product surfaces.

## Verification

- `npm run test:unit` passed: 388/388.
- `npm run build` passed.
- `node scripts/check-i18n.mjs` passed with 0 missing/orphan/empty KZ keys.
- Targeted ESLint had no errors; it still reports an existing `react-hooks/set-state-in-effect` warning in `CompareScreen.jsx`.

## Remaining Decisions

- Decide whether medical conditions (`diabetes`, `celiac`, `pku`) should become visible profile controls before pilot, because the engine supports them but the current profile UI mainly exposes diet/allergen choices.
- Decide how strict Körset should be for `kid_friendly` and `keto`; those profile goals are visible but need product-policy rules before deterministic Fit-Check should judge them.
