# Multi-Store Foundation + 3 Pilot Stores

Date: 2026-05-24

## Summary

Added multi-store architecture foundation and created 3 realistic minimarket stores for pilot presentations. Stores are now manageable via CLI scripts without touching code.

## Stores Created

| Store | Slug | Type | City | Catalog | Owner Email |
|-------|------|------|------|---------|-------------|
| Марс | mars | minimarket | Усть-Каменогорск | ~10K products (existing) | kabylnuraly@gmail.com |
| Нұрлы | nurly | minimarket | Усть-Каменогорск | ~2.5K products | owner-nurly@korset.kz |
| Калина | kalina | minimarket | Усть-Каменогорск | ~2K products | owner-kalina@korset.kz |

## Database Changes

- Migration 040: `set_stores_updated_at` trigger on stores table (auto-updates updated_at on UPDATE)
- Migration 041: `store_products_store_ean_key` unique index on (store_id, ean)
- Mars store: code changed from "store-one" to "mars", type changed to "minimarket", profile fields populated (address, phone, description, whatsapp)
- Mars instagram_url cleared (minimal footprint strategy)
- Two new auth.users created for Nurly and Kalina owners
- Two new stores inserted with full profile data
- Logos uploaded to store-logos Storage bucket

## New Scripts

- `scripts/create-store.mjs`: Full store creation in one command (auth user + store record + optional catalog seed). Params: --slug, --name, --type, --city, --owner-email, --owner-password, --max-products, --category-weights, --dry-run
- `scripts/deactivate-store.mjs`: Soft deactivation (--hard for catalog deletion). Preserves scan history and analytics.
- `scripts/seed-store-catalog.mjs` (refactored): Parameterized --store-id/--store-slug, --max-products, --category-weights, --dry-run. Backward compatible with MARS default.
- `scripts/seed-store-catalog-lib.mjs`: Shared catalog seeding library with category-weighted product selection
- `scripts/generate-logos.mjs`: PNG logo generator using sharp

## Frontend Changes

- `RetailEntryScreen.jsx`: Multi-store support. If owner has 1 store → auto-redirect. If >1 stores → StorePicker with selection UI. Replaced `.limit(1).maybeSingle()` with `.order('name')`.
- `src/data/stores.js`: Offline fallback now includes 3 stores (mars, nurly, kalina) instead of 1 demo store
- `src/data/storeInventories.js`: Updated with shared BASE_INVENTORY for all stores
- `src/components/RetailBottomNav.jsx`: Removed 'store-one' fallback (now uses null if no currentStore)
- `src/screens/QRPrintScreen.jsx`: Removed 'store-one' fallback, returns empty array if no store
- `src/screens/EanRecoveryScreen.jsx`: Removed 'store-one' fallback
- `src/screens/ProfileScreen.jsx`: Removed 'store-one' fallback, navigation guard
- `src/screens/LandingScreen.jsx`: Generic demo URL 'korset.app/s/ваш-магазин' instead of 'mars'

## Architecture Notes

- DB schema already supports multi-store per owner (no UNIQUE on owner_id in stores)
- All RLS policies use `IN (SELECT id FROM stores WHERE owner_id = auth.uid())` — correctly returns all owned stores
- All RPC functions accept store_id parameter — multi-store compatible
- StoreContext works per-slug (one store at a time per session) — correct for consumer flow
- Retail flow: owner can now access multiple stores via StorePicker

## Manual Steps Required

1. Apply migrations 040 and 041 via Supabase Dashboard SQL Editor
2. Mars owner account (kabylnuraly@gmail.com) password: unchanged from original setup
3. Nurly owner (owner-nurly@korset.kz) password: Nurly2026Pilot!
4. Kalina owner (owner-kalina@korset.kz) password: Kalina2026Pilot!
5. Store credentials should be stored securely and rotated before production
