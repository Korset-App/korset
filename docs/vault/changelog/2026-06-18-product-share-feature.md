---
title: Product Share Feature (Web Share API + Server SEO)
domain: changelog
status: complete-local
date: 2026-06-18
language: ru
---

# Product Share Feature

## Context

Strategic shift to Digital Storefront requires that product links shared in WhatsApp/Telegram/Instagram show rich previews (photo + name + price + store), not a blank Körset page. Also added a native share button on ProductScreen.

## Changes

### api/product-seo.js (NEW)
Serverless Vercel function that intercepts bot requests to `/s/:storeSlug/product/:ean`. Queries Supabase in parallel for both store and product data, then injects:
- `og:title` → `«Product Name · 450 ₸ | Store Name»`
- `og:description` → short description or generated fallback
- `og:image` → product images[0] → product.image → store logo → default Körset icon
- `og:url` + `link[canonical]` → canonical product URL
- Schema.org `Product` JSON-LD with brand and `Offer` (price + currency)
- Cache: `s-maxage=1800, stale-while-revalidate=3600`

### vercel.json (MODIFY)
- Registered `api/product-seo.js` in `functions` with `includeFiles: dist/index.html`
- Added rewrite `/s/:storeSlug/product/:ean → /api/product-seo?storeSlug=$1&ean=$2`
- **Order is critical**: product route placed before store-level route `/s/:storeSlug`

### ImageCarousel.jsx (MODIFY)
- Added optional `onShare` and `shareLabel` props
- Extracted `ShareButton` sub-component: glass-dark overlay button (rgba(0,0,0,0.45) + backdrop-filter blur), white `ios_share` icon, positioned bottom-right at z-index:5
- Renders on both normal carousel and the empty-image placeholder

### ProductScreen.jsx (MODIFY)
- Added `shareCopied` state
- Added `handleShare` function:
  - Builds canonical URL `https://korset.app/s/{storeSlug}/product/{ean}`
  - Builds share text: `«Store Name — Product Name · 450 ₸»`
  - Uses `navigator.share` (Web Share API, mobile) with silent catch on cancel
  - Falls back to `navigator.clipboard.writeText` (desktop) + 2s toast
- Passed `onShare={handleShare}` and `shareLabel={t('product.share')}` to `<ImageCarousel />`
- Added `fadeInUp` toast notification at screen bottom (above nav bar, safe-area-aware)

### index.css (MODIFY)
- Added `@keyframes fadeInUp` for the share-copied toast slide-up animation

### Locales
- `src/locales/ru/product.json`: added `product.share = "Поделиться"`, `product.shareCopied = "Ссылка скопирована"`
- `src/locales/kz/product.json`: added `product.share = "Бөлісу"`, `product.shareCopied = "Сілтеме көшірілді"`

## Verification

- `node scripts/check-i18n.mjs` — PASS (0 missing KZ keys)
- `npm run test:unit` — PASS (565/565)
- `npm run build` — PASS

## Design Decisions

- Web Share API chosen over custom bottom sheet: it surfaces the OS-level app picker (WhatsApp, Telegram, SMS, Email...) which is more complete and zero-maintenance
- Button placement in image corner is consistent with Kaspi.kz and Wildberries patterns
- Product route `/s/:storeSlug/product/:ean` must come before `/s/:storeSlug` in vercel.json to avoid being swallowed by the store-level rewrite
