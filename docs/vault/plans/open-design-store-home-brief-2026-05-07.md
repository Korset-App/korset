# Open Design Brief: Store Home Screen

> Status: active
> Date: 2026-05-07
> Owner: Körset
> Surface: consumer store home, `/s/:storeSlug`
> Связи: [[retail-cabinet]] · [[product-resolution]] · [[2026-05-08-store-ai-pilot-spec]]

## Project Context

Körset is a mobile-first PWA for offline grocery stores in Kazakhstan. A shopper opens a store-specific link or QR code, scans a barcode in that exact store, and gets a Fit-Check for allergens, halal status, diets, ingredients, nutrition, availability, and price.

Business model: B2B2C. Stores pay for SaaS; shoppers use the consumer flow for free. V1 scope is grocery stores only.

Core stack:
- React 18 + Vite
- JavaScript, not TypeScript
- Vanilla CSS, not Tailwind
- Supabase for data/auth/storage/RLS
- Dark and light themes via semantic CSS variables
- RU/KZ i18n via `useI18n`

## Target Screen

Design the main consumer home screen for a store:

```text
/s/:storeSlug
```

This is not the public marketing landing page (`/`) and not the store public info page (`/stores/:storeSlug`). It is the first screen shoppers see after opening a specific grocery store context.

Current implementation lives in:
- `src/screens/HomeScreen.jsx`
- `src/components/BottomNav.jsx`
- `src/locales/ru/home.json`
- `src/locales/kz/home.json`
- `src/index.css`

The current store-home UI includes:
- Store identity header: logo/fallback mark, verified store badge, store name, city/address, short description, contact chips, more-info link.
- Context banner: explains that allergens, halal, nutrition, availability, and price are adapted to this branch.
- Primary action: scan barcode.
- Secondary actions: catalog, AI assistant.
- History entry.
- Persistent bottom navigation: Home, Catalog, central Scan, AI, Profile.

## Product Goal

The screen must make the shopper feel:
- "I am inside this exact store."
- "The next action is obvious: scan a barcode."
- "Körset checks what matters to me: allergens, halal, diet, ingredients, price, availability."
- "This is serious and trustworthy, not a toy scanner."

The screen must also help the store sell the SaaS value:
- It should make the store look official and digitally upgraded.
- Store context must be visible above the fold.
- The UI should imply that better catalog data, prices, and availability benefit both shoppers and the store.

## Required Content

Use realistic Russian UI copy. Keep copy compact.

Primary screen content:
- Store: "Magnum Express"
- Location: "Кызылорда · ул. Абая, 12"
- Store badge: "Официальный магазин"
- Context headline: "Контекст магазина"
- Context text: "Аллергены, халал, КБЖУ, наличие и цена адаптированы под этот филиал."
- Primary CTA: "Сканировать штрихкод"
- Primary CTA subtext: "Наведи на любой товар в магазине"
- Secondary action: "Каталог" / "Все товары"
- Secondary action: "AI помощник" / "Спроси что угодно"
- History action: "Моя история" / "Отсканированные товары"
- Optional trust chips: "Без установки", "Работает офлайн", "По QR"
- Bottom nav: "Главная", "Каталог", "Скан", "ИИ", "Профиль"

## Layout Requirements

Mobile-first PWA screen, designed for iPhone 15 Pro frame.

Priority order:
1. Store identity and context.
2. Large scan action.
3. Fast secondary actions.
4. History/profile affordance.
5. Bottom navigation.

Above the fold should include:
- Store identity.
- Store-context message.
- Primary scan CTA.
- At least the top of secondary actions.

Design constraints:
- Single screen, not a multi-screen flow.
- Do not design a marketing landing page.
- Do not use pharmacy, electronics, marketplace, alcohol, or tobacco concepts.
- Do not create onboarding.
- Do not over-explain how the app works.
- Avoid generic food-delivery aesthetics.
- Avoid playful mascot style.
- Avoid decorative gradient blobs/orbs as the main visual idea.
- Keep tap targets at least 44px.
- The scan button must be the strongest action.
- Bottom nav must feel native and stable, with central scan action emphasized.
- Text must fit on narrow mobile screens.

## Visual Direction

Recommended Open Design setup:

```text
Skill: mobile-app
Design system: linear-app
```

Rationale: Körset should feel premium, precise, and trustworthy. `linear-app` is a better starting point than a cheerful consumer palette because the screen handles health/religious/diet risk and store trust. Keep the result warmer and more grocery-relevant through status accents and content, not through decoration.

Visual tone:
- Premium, serious, clear, store-context-first.
- Dark-mode-native, but easy to translate into light mode later.
- Calm surfaces, precise spacing, restrained depth.
- Accent can combine Körset purple and sky/cyan, but should not become a purple-blue gradient wallpaper.
- Use status colors only for meaning: safe, warning, unavailable, official.

Körset token references from current app:
- `--primary`: purple
- `--primary-bright`: brighter purple
- `--accent-sky`: cyan/sky
- `--bg-app`: app background
- `--text`, `--text-sub`, `--text-dim`
- `--glass-*` surfaces and borders
- `--nav-*`
- Fonts: `--font-display` = Advent Pro, `--font-body` = Inter

## Open Design Prompt

```text
Design a single mobile app screen for Körset, a mobile-first PWA for offline grocery stores in Kazakhstan.

Surface: store-specific consumer home screen at /s/:storeSlug. This is the first screen a shopper sees after opening a QR/link for a specific grocery store. It is not a marketing landing page and not onboarding.

Context:
- Körset lets shoppers scan a barcode inside a specific grocery store and get a Fit-Check for allergens, halal status, diets, ingredients, nutrition, price, and availability.
- Business model is B2B2C: stores pay, shoppers use the flow for free.
- The screen must make the shopper feel they are inside this exact official store and that the obvious next step is scanning a product.

Use Russian UI copy:
- Store name: Magnum Express
- Location: Кызылорда · ул. Абая, 12
- Store badge: Официальный магазин
- Context headline: Контекст магазина
- Context text: Аллергены, халал, КБЖУ, наличие и цена адаптированы под этот филиал.
- Primary CTA: Сканировать штрихкод
- Primary CTA subtext: Наведи на любой товар в магазине
- Secondary actions: Каталог / Все товары, AI помощник / Спроси что угодно
- History action: Моя история / Отсканированные товары
- Trust chips, if space allows: Без установки, Работает офлайн, По QR
- Bottom nav: Главная, Каталог, Скан, ИИ, Профиль

Layout:
- iPhone 15 Pro framed mobile screen.
- Store identity and context above the fold.
- Large dominant scan CTA.
- Compact secondary action cards below.
- Stable bottom navigation with a central emphasized scan action.
- The top of secondary actions should be visible without scrolling.

Visual direction:
- Premium, serious, trustworthy, precise.
- Dark-mode-native, with calm surfaces and restrained depth.
- Use Körset-like purple and sky/cyan accents sparingly.
- Make it feel like a grocery store has gained a reliable digital layer, not like a generic delivery app.

Avoid:
- Marketing hero page.
- Multi-screen onboarding.
- Pharmacy/electronics/marketplace/alcohol/tobacco cues.
- Mascots, cheap gamification, decorative blobs/orbs, noisy gradients.
- Too much explanatory text.

Output one polished HTML artifact only.
```

## Implementation Notes For Later

When translating the design back into the app:
- Keep route behavior inside `/s/:storeSlug`.
- Use `useI18n` and add RU/KZ keys for any new user-facing text.
- Support dark and light themes through semantic CSS variables.
- Avoid raw `#fff`, `#000`, and hardcoded transparent white/black for core UI surfaces/text.
- Prefer extracting store-home styles out of inline JSX into a focused CSS class set.
- Preserve bottom nav route behavior from `BottomNav.jsx`.
- Do not redesign adjacent screens unless approved.

