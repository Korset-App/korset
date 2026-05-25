# Public Barcode Source Benchmark

Date: 2026-05-25

## What changed

- Added `scripts/_tmp_public_barcode_benchmark.mjs` to benchmark free/public barcode sources on the same Supabase-backed product sample.
- The script tests Open Food Facts, UPCitemdb public pages, and Go-UPC public pages on a stratified food sample with missing sugar/salt/fiber.
- Barcode Lookup was not included in the live run because the public site triggered security verification here and the API still requires a paid or test key.

## Results

- 50-product local sample:
  - Open Food Facts: `11/50` found, `7/50` sugar, `7/50` salt/sodium, `5/50` fiber, `4/50` all three.
  - UPCitemdb public: `1/50` found, no ingredient or numeric nutrition coverage.
  - Go-UPC public: found some exact pages, but the site rate-limited / sign-up gated sustained use and did not provide numeric nutrition at useful scale.
- 20-product global-brand sample:
  - Open Food Facts: `9/20` found, `8/20` sugar, `8/20` salt/sodium, `5/20` fiber, `5/20` all three.
  - UPCitemdb public: `3/20` found, no ingredient or numeric nutrition coverage.
  - Go-UPC public: zero usable results in the sustained run because of 429s / anti-automation gating.

## Decision

- Free/public barcode sources are not enough for mass enrichment of sugar/salt/fiber on the current catalog.
- Open Food Facts remains the only free source worth keeping as a baseline, mainly for global-branded foods.
- For the pilot, broad automatic enrichment should stay limited and review-gated unless a paid/private source or supplier feed is added.
