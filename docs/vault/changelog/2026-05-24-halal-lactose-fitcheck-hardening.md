# 2026-05-24 - Halal and Lactose Fit-Check hardening

## Summary

Tightened the deterministic Fit-Check contract for halal shoppers and split lactose-free from the old dairy-free naming.

## Changes

- Halal profile now treats `halalStatus: no` as `danger`, not a soft caution.
- Halal profile now treats `halalStatus: unknown` as at least `caution`.
- Unknown halal with ambiguous origin ingredients such as gelatin, enzymes, rennet, carmine, E120, E441, or generic flavorings becomes `warning`.
- Explicit alcohol/haram signals still become `danger`.
- The user-visible diet goal is now `lactose_free` ("Без лактозы" / "Лактозасыз").
- Legacy `dairy_free` profile values are migrated to `lactose_free` when profiles are loaded, normalized, saved, or presets are applied.
- Lactose-free no longer automatically implies milk allergy. Users who must avoid milk proteins should still use the milk allergen setting.
- Product diet badges now look for `lactose_free` tags.

## Verification

- `node --test tests/unit/fitCheck.test.mjs` - 77/77 passed.
- `node --test tests/unit/profile.test.mjs` - 3/3 passed.
- `npm run test:unit` - 395/395 passed.
- `node scripts/check-i18n.mjs` - passed, no missing/orphan/empty KZ keys.
- `npm run build` - passed.
- Targeted ESLint for changed files passed with 0 errors; existing warning remains in `ProfileContext.jsx` for synchronous state update inside an effect.

## Notes

Full `npm run lint` is currently blocked by an unrelated existing error in `src/telegram-bot/verifyWebhook.js` (`/* eslint-env */ comments are no longer supported`). That file belongs to parallel Telegram webhook work and was not changed in this task.
