# Offline navigation fix and Jev validation

## Pilot defect

The production service worker precached index.html but had no navigation fallback.
With a service worker installed and connectivity disabled, opening a store deep link
failed with Chrome ERR_INTERNET_DISCONNECTED. A production-build browser test
reproduced the failure at /s/pwa-test/catalog before the implementation change.

src/sw.js now routes navigations to precached index.html, excluding /api and /assets.
playwright.pwa.config.js and tests/pwa/offlineNavigation.spec.js exercise catalog,
scanner, reload and API exclusions without calling remote application services.

Verification: production build passed; ESLint src/sw.js passed; browser test passed
(1/1, Chrome, 4.5 seconds). Initial full unit baseline: 664/664; lint: 82 warnings,
no errors. Full quick check remains blocked by pre-existing whitespace in DietIcon.jsx.
Windows sandbox could not finish Playwright server cleanup; the same local browser
test exited successfully with narrow process-management escalation.

Reproduce: npm run build, then node node_modules/@playwright/test/cli.js test
--config playwright.pwa.config.js. Requires installed Chrome.
This tests offline app-shell navigation, not full offline store-data or pilot readiness.
No production deployment or database write occurred.

## Workflow evidence

One authorized synthetic Jev request used the official API endpoint and existing key.
Correct choice a, confidence 0.98, input_tokens 336, output_tokens 40.
No project code or customer data sent. No token/cost saving versus Astra was measured.
The bug was diagnosed and fixed by the main agent; Jev was only a connection check.

Correction: 52 skill-disable settings were written, but the desktop still advertises
the skills. Runtime disabling/savings cannot be claimed until independently verified
in a new desktop task. Current documentation now states this limitation.
