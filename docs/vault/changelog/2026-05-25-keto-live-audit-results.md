# Keto live audit results

Date: 2026-05-25

## What we checked

Ran the updated keto Fit-Check logic against the full active catalog and saved the report to `C:\tmp\korset-keto-audit.json`.

## Main results

- Active products scanned: 11,862
- Verdict split: 1,440 safe, 10,422 caution, 0 warning, 0 danger
- Strict nutrition coverage: carbs known for 8,544 products, sugar for 145, fiber for 74, and 3,290 products have neither carbs nor sugar
- Explicit keto and low-carb tags were not present in the current catalog

## Product interpretation

- Keto now behaves as a strict, honest filter rather than a fake green badge
- The current bottlenecks are both product fit and uneven nutrition completeness
- Most products fall into caution because they either exceed keto carb/sugar limits, have added-sugar signals, or lack enough nutrition data for a green verdict
- The audit script now treats blank/null nutrition as missing instead of converting it to zero

## Operational note

This confirms that the keto logic is conservative and usable, but the catalog still needs richer keto labeling and better sugar/fiber nutrition coverage if we want more green results without lying to users.
