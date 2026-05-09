# 2026-05-03 — Data Moat V1 pilot scope

> Связи: [[data-moat-strategy]] · [[data-moat-pipeline-strategy]] · [[data-moat-best-actions-2026-05-03]]

Decision: full Data Trust Layer is too deep for V1. For the upcoming pilot, Körset should implement the smallest high-impact Data Moat slice that improves buyer trust, helps the store owner see value, and avoids risky AI overclaims.

V1 focus:
- Show simple data confidence only where it matters for safety and trust.
- Prioritize catalog coverage, ingredients coverage, unknown EAN handling, and retail-facing import quality.
- Avoid building a complex source registry, partner integrations, or full verification workflow before the pilot.

Recommended V1 actions:
1. ProductScreen: add a lightweight confidence notice for preliminary/AI/low-quality data.
2. Fit-Check: add cautious wording when source confidence is low, especially for allergens and halal.
3. Retail Cabinet: show 3 simple catalog quality metrics: products imported, products with ingredients, unknown EAN count.
4. Unknown EAN queue: make unresolved scans visible to the store owner and easy to fix.
5. Data cleanup: improve the existing 7000-product catalog before expanding into complex external integrations.

Post-V1:
- Source Registry, official GS1/NPC/Halal Damu integrations, advanced source conflict resolution, and a full Trust Score can wait until pilot feedback confirms demand.
