# /stores Premium Gateway Cleanup

Date: 2026-05-25
Domain: changelog

## Summary

Refined `/stores` away from loud “wow” decoration toward a quieter premium glass gateway. The screen should feel precise, calm, and store-context-first rather than promotional.

## What Changed

- Removed the pilot-network eyebrow, three pseudo-stat cards, decorative grid/orb background, card shine overlay, and noisy card tone overlays.
- Switched the top logo by app theme: white wordmark for dark theme and `logo-light.png` for light theme.
- Reduced the hero to a compact one-line title plus subtitle, with lighter typography and tighter vertical rhythm.
- Made store cards denser and more aligned: centered logo block, lower card height, calmer glass, status/type/name/location/hours/CTA only.
- Replaced the stores search icon with the same SVG glyph pattern used by `CatalogScreen.jsx` instead of Material Symbols.
- Changed owner CTA from `/#retail` to `https://t.me/korset_support_bot` with external-link attributes.
- Corrected Mars fallback address to `ул. Абая` and normalized the old `, левобережный район` suffix from Supabase-backed listings before display/search indexing.
- Removed obsolete RU/KZ i18n keys for the deleted eyebrow, stats, and card description.
- Refined the second pass after visual review: stronger light-theme card/search borders, cleaner dark-theme transparent glass layering, neutral card CTA copy (`В магазин` / `Дүкенге`) with a custom circular mark instead of a colored Material arrow, and fixed double-brace i18n interpolation so `{{count}}` renders as `3 магазина` instead of `{3} магазина`.
- Added local SVG pilot store logos: `public/store-logos/mars.svg`, `public/store-logos/nurly.svg`, and `public/store-logos/kalina.svg`. For pilot slugs these local marks intentionally override Supabase `logo_url`; non-pilot stores still use uploaded logos.
- Third visual pass after owner feedback removed the “premium glass” direction from dark theme: no backdrop blur, no shine effects, and no random multicolor card tones. A later navy/violet surface experiment was rejected by the owner and reverted. Current direction: keep the prior calm dark background/panel/cards, use purple as a text/typography accent only, and avoid putting purple bands, tint layers, or decorative accents on store cards/panels without explicit approval.
- The subtitle was simplified for shoppers: removed “контекст” wording. RU now says users choose a store to check products from that store’s assortment; KZ uses the same plain-language idea.

## Product Notes

- Do not restore fake network stats or promotional “pilot network” copy unless backed by real product/business data.
- `/stores` remains the public store selector and still routes selected stores into `/s/:storeSlug`.
- Current B2B contact action should go to Telegram Support Bot until a dedicated retail lead flow is approved.

## Verification

- `node --test "tests/unit/storeListing.test.mjs"` passed.
- `npx eslint "src/screens/StoresScreen.jsx" "src/domain/stores/listing.js"` passed.
- `npm run check:agent:i18n` passed.
- Browser smoke on `390x844` passed for dark and light themes, including logo switching and Mars address normalization.
- Second browser smoke on `390x844` passed for local store logos, count formatting, neutral CTA, and light/dark glass border/background checks.
- Owner selected future direction: “Минимализм + акцент”, accent use: “В тексте”, subtitle direction: shorter shopper-readable copy.
- `npm run build` passed with existing Vite dynamic-import and Sentry auth-token warnings.
