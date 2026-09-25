# 2026-09-25 — Catalog V4 Semeiniy Photo Root Cause Discovery & Master Plan Update

## Context
User pointed out that on the live `semeiniy.kz` website, photo coverage is virtually 100% (or >90%) with perfect match to product cards. User challenged the previous false claim that the store database had corrupted IDs.

## Root Cause Discovery
1. Deep inspection of HTML on `semeiniy.kz` revealed two different templates in Webasyst/Seller theme:
   - `<!-- app: shop; template: html/product/images -->` (SINGULAR): The actual hero product photo gallery.
   - `<!-- app: shop; template: html/products/images -->` (PLURAL): The recommendation/swiper carousel at the bottom of the page.
2. The legacy crawler `scripts/crawl-semeiniy.mjs` had:
   `html.match(/<!--\s*app:\s*shop;\s*template:\s*html\/products\/images\s*-->/i)`
3. This single-letter typo caused the crawler to bypass the main product photo and extract images from the recommendation widget at the bottom of the page:
   - Ariel capsules were assigned Nescafe Gold coffee.
   - Waffles were assigned Raffaello candy or Ariel powder.
   - A single Must Have muesli bar was assigned to 7,606 products.
4. Active Storefront Category Verification:
   - Confectionery: 16/16 (100% real photos)
   - Beverages: 18/18 (100% real photos)
   - Grocery: 26/26 (100% real photos)
   - Real photos are high-quality 700x700 studio packshots on white backgrounds.
5. The 28-30% number came from scanning legacy/archived/draft URLs from the raw 68k sitemap dump. Active store products have 90-100% photo coverage.

## Changes Made
- Updated `AGENTS.md` (corrected Semeiniy photo invariant and selector).
- Updated `docs/CONTEXT.md` (fast-start context under 250 lines).
- Updated `docs/vault/decisions/2026-09-25-catalog-v4-real-audit-and-ai-vision-mandate.md` (photo hierarchy and root cause).
- Created `docs/vault/plans/2026-09-25-master-catalog-v4-execution-plan.md` (30 packaging attributes, multi-source consensus, AI Vision gate, execution roadmap).
