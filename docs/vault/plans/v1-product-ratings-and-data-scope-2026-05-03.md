# 2026-05-03 — V1 Product Ratings, Unknown EAN, Unsupported Goods

> Связи: [[data-moat-strategy]] · [[ean-recovery-system]] · [[fit-check-engine]]

## Final V1 decision

Körset V1 is preparing for a near pilot with a solo developer workflow. Scope must stay narrow, polished, and shippable. Do not add systems that create extra release work unless they clearly improve the pilot.

## Product scoring

Do not show a 100-point product quality score in ProductScreen or the main buyer flow.

Reasons:
- Körset does not yet have enough complete product data for a defensible absolute product score.
- A 100-point score implies expert authority across ingredients, nutrition, price, taste, quality, halal, allergens, and personal fit.
- This is overkill for V1 and creates reputational risk.
- ProductScreen should stay focused on the buyer's practical question: can I buy this product, should I avoid it, or should I check something?

CompareScreen may keep its existing relative comparison behavior, but V1 should not expand it into a public product score. Wording should stay modest: better fit for your profile / compare by visible fields, not "objective product quality".

## Public ratings and feedback

Do not add Kaspi-style public 5-star product ratings in V1.

Reasons:
- Ratings need user volume to be meaningful.
- Early pilot ratings will be sparse and noisy.
- A single bad or random rating can make a product look unfairly bad.
- Public ratings need moderation, anti-spam, aggregation rules, and empty states.
- It is unclear whether ratings are global, store-specific, per EAN, or per product variant.
- This increases release work without being critical for the pilot.

Do not add a separate lightweight feedback system in V1 unless it is directly tied to a real problem. For now, skip both public ratings and general feedback signals.

Allowed V1 exception:
- Keep or add one narrow action only where needed: a request button on the "product not found" state.
- Purpose: user scanned a normal grocery product, Körset did not find it, and the user asks to add/check it.
- This is not a rating feature. It is a data coverage request.

Post-V1:
- Public 5-star ratings, taste/price/quality reviews, like/dislike, and aggregated social proof can be reconsidered after the pilot if there is enough traffic and a clear moderation strategy.

## Unknown EAN queue

"Unknown EAN queue" means: every unresolved scan becomes a structured data-improvement task, not a dead end.

V1 behavior:
- User scans barcode.
- Resolver cannot find a supported product.
- App shows a clear "not found / not supported" state.
- User can tap "Request product check" if they scanned a normal grocery product.
- System stores the EAN, store id, timestamp, optional user id, and scan context.
- Retail/admin side can later see which EANs were requested most often and enrich them manually or through scripts.

Why this matters:
- It helps improve coverage using real pilot behavior.
- It gives the owner/operator a prioritized list instead of guessing what to add next.
- It keeps the buyer experience honest: no fake AI answer for unknown products.

For V1 this can be simple: store unresolved scans and expose enough data for the operator/admin. A polished owner workflow can come later.

## Alcohol and tobacco handling

V1 grocery scope excludes alcohol and tobacco. The problem: if an EAN is unknown, Körset usually cannot know whether it was alcohol, tobacco, or just a missing grocery product.

Therefore V1 should use one general unsupported/not-found state:

"Körset пока не нашёл этот товар. Мы также не поддерживаем алкогольную и табачную продукцию, поэтому для таких товаров Fit-Check недоступен. Если это обычный продукт питания, отправьте запрос — мы проверим и добавим его."

Behavior:
- Do not say "this is alcohol" unless category is known.
- Do not run Fit-Check for unknown EAN.
- Do not generate AI guesses for unknown EAN in the buyer flow.
- Give one clear button: "Request product check" / "Отправить запрос".
- Optional small secondary action: "Scan another product".

If a product is known and category is alcohol/tobacco:
- Show unsupported-category state.
- Do not show Fit-Check.
- Do not offer health, halal, allergen, or diet recommendations.

## Retail Cabinet metrics for V1

Do not show "products with ingredients" as a store-owner problem. Körset owns product card quality, not the store.

Useful V1 store-facing metrics:
- Products synced/imported.
- Scans in this store.
- Products not found after scans.
- Top requested unknown EANs.
- Optional: products that need operator review.

The selling message is not "your catalog has missing ingredients". The selling message is: "Körset shows what shoppers scan and helps close product coverage gaps."

## V1 priorities

1. Remove/avoid 100-point product scoring in main buyer flow.
2. Do not add public ratings or general feedback in V1.
3. Keep ProductScreen clean and focused on Fit-Check, product facts, alternatives, and scan outcome.
4. Build a simple unknown EAN request flow.
5. Add a general not-found state that mentions alcohol/tobacco exclusion without claiming the scanned item is alcohol.
6. Show store-facing value through synced products, scans, not-found scans, and requested unknown EANs.
7. Continue improving current catalog quality: names, KZ names, images, ingredients, empty states.

## Post-V1

- Public ratings and reviews.
- Detailed user feedback categories.
- Advanced Trust Score or quality score.
- Source Registry and official source conflict resolution.
- Full owner workflow for resolving unknown EANs.
- Official GS1/NPC/Halal Damu partnerships and deeper verification flows.
