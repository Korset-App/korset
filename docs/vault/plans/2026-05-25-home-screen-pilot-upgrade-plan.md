# Home Screen Pilot Upgrade Plan

Status: active, staged implementation
Surface: consumer store home `/s/:storeSlug`

## Goal

Bring the store-specific HomeScreen to pilot quality for a first-time shopper who enters from a store QR code. The screen must explain value quickly, make scan the dominant action, push Fit-Check setup without blocking first value, support PWA install, and keep store facts compact.

## Stage 1 — Store Data Foundation

- Add `stores.opening_hours` as a real store field.
- Let retail owners edit opening hours in Retail Settings.
- Sanitize opening hours through the existing retail settings payload helper.
- Do not redesign HomeScreen in this stage.

## Stage 2 — HomeScreen Information Architecture

- Rebuild HomeScreen layout order: compact header, stories, scan CTA, Fit-Check gate, quick actions, install banner, compact store panel.
- Keep buyer flows inside `/s/:storeSlug`.
- Remove history from the main HomeScreen surface; keep it available through bottom navigation, profile, and the future avatar menu.

## Stage 3 — Interactive Value Layer

- Add 5 universal stories: what Körset is, how scan works, Fit-Check setup, halal/allergy/sugar, install as app.
- Add soft Fit-Check gate based on local profile state: halal, allergens, sugar.
- Add PWA install logic: Android `beforeinstallprompt`, iOS manual instruction, dismiss/install persistence.

## Stage 4 — Avatar Menu And Store Actions

- Use `<ProfileAvatar />` in the header.
- Add compact avatar mini-menu: profile, preferences, language/theme, history, FAQ/support, install.
- Show only useful store facts on HomeScreen: address, opening hours, contacts, more info.

## Stage 5 — Warm Premium Visual Polish And QA

- Apply warm premium app styling with dark/light token support.
- Avoid heavy gloss, fake marketplace/product-delivery visuals, and noisy gradients.
- Run targeted i18n/unit checks, then mobile browser smoke on `/s/mars` in dark and light themes.

## Deferred

- Store-managed stories, promotions, retail CMS, and analytics for story engagement are out of this staged HomeScreen upgrade.
