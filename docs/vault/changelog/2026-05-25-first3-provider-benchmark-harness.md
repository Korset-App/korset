# 2026-05-25 - First-Three Provider Benchmark Harness

Added a reusable benchmark harness for the first three enrichment candidates: FatSecret, Chomp, and Nutritionix.

What changed:
- `scripts/_tmp_first3_barcode_benchmark.mjs` queries a stratified sample of active food products with real EANs and missing sugar/salt/fiber.
- The harness normalizes results into the same coverage model used by the earlier barcode benchmark.
- FatSecret support uses OAuth2 client credentials and the barcode endpoint documented as Premier exclusive.
- Nutritionix support uses `x-app-id` and `x-app-key` with `/v2/search/item`.
- Chomp support is wired as an API-key lookup harness with multiple auth attempts and a configurable barcode lookup path.

What we learned:
- The script runs successfully end to end.
- The current workspace does not have credentials for FatSecret, Chomp, or Nutritionix, so the live benchmark is blocked until the owner registers/loads keys.
- The live test run with `--limit=5` returned `missing_api_key` for all three providers and saved a report to `C:\tmp\korset-first3-provider-benchmark.json`.

Why this matters:
- We now have a single harness that can be rerun as soon as the needed credentials are available.
- The first three providers can be compared on the same sample without changing the evaluation logic again.
