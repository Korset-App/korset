# Store-Aware AI Pilot Spec

> Domain: plans
> Status: active
> Date: 2026-05-08
> Scope: buyer AI assistant, product AI, store knowledge, catalog grounding, chat persistence, pilot cost control
> Связи: [[fit-check-engine]] · [[product-resolution]] · [[open-design-store-home-brief-2026-05-07]] · [[retail-cabinet]] · [[2026-05-09-store-ai-implementation-roadmap]]

## Goal

Make KORSET AI a store-aware shopping assistant for pilot minimarkets: it should know the current store, use real catalog data, show concrete product cards, explain product fit, preserve chat context, and create clear B2B value without overbuilding V1.

## Owner Decisions So Far

- AI tone: formal "вы" in Russian/Kazakh UI responses.
- Prices should be shown when available.
- Shelf/location in store is out of V1 scope.
- Meal/recipe knowledge may use general model knowledge, but concrete products must come only from the current store catalog.
- Buyer AI is primary. Retail AI should start as dashboard insights, not a full owner chat.
- Demo stores should look like real public stores for sales demos, with realistic names, addresses, and catalogs.
- Store-specific AI notes are needed so each store can add extra information beyond public banner/profile fields.

## Product Positioning

KORSET AI is not a generic food chatbot. It is the assistant of the current store.

It should answer:
- what this store is and how to contact it;
- which products in this store fit the shopper's profile;
- which alternatives exist in this store;
- what to buy for a recipe, meal, diet, or budget;
- what is unknown and what the user should verify on packaging.

## Data Sources

### Store Brain

Use existing `stores` fields:
- name;
- code/slug;
- city;
- address;
- phone;
- email;
- type;
- description;
- short_description;
- logo_url;
- instagram_url;
- whatsapp_number;
- twogis_url;
- website_url.

Recommended new field:
- `ai_store_notes text` on `stores`.

Purpose:
- owner/operator can add facts AI should know;
- examples: working hours, delivery, payment methods, store strengths, halal focus, local services, return policy, cashier instructions, current limitations.

V1 recommendation:
- add the field in retail settings if implementation cost is acceptable;
- otherwise fill it manually for pilot stores through controlled owner/admin workflow.

### Catalog Brain

Use current store catalog only:
- store_products overlay: price, stock_status, local_name, active state;
- global_products facts: name, name_kz, brand, category, subcategory, quantity, description, ingredients, allergens, diet tags, halal status, nutrition, image.

Do not send the entire catalog to the model. First retrieve a compact relevant set, then send only selected candidates.

### User Brain

Use profile data already available:
- language;
- halal preferences;
- allergens;
- diet goals;
- later: favorites/history if privacy settings allow.

### Knowledge Brain

Use Vault/RAG for stable domain knowledge:
- e-additives;
- halal uncertainty;
- allergens and traces;
- product data limitations.

Do not use RAG as a replacement for actual product facts.

## AI Behaviors

### General Store Assistant

Route: `/s/:storeSlug/ai`.

Default welcome should be store-specific:
"Здравствуйте. Я помощник Mast. Могу найти товары в этом магазине, собрать список покупок или объяснить состав."

Core prompts/chips should demonstrate real capabilities:
- "Соберите продукты для плова"
- "Что есть без лактозы?"
- "Покажите халал-сладости"
- "Что купить на ужин до 5000 ₸?"
- "Расскажите про магазин"

Chips can be static in V1, then become dynamic from catalog/store facts:
- if many halal products: show halal chip;
- if many dairy-free products: show lactose-free chip;
- if store has description/contact fields: show store info chip;
- if catalog has categories: show category-based chips.

### Product AI

Route: `/s/:storeSlug/product/:ean/ai`.

Must use:
- current product facts;
- current store facts;
- shopper profile;
- current price/stock when available;
- alternatives from same store.

Must not:
- invent composition;
- override deterministic Fit-Check;
- promise guaranteed shelf availability.

### Meal / Recipe Shopping

The model may infer ingredient groups from the recipe request, but product selection must be grounded in store catalog search.

Response shape:
- short text reply;
- grouped product recommendations;
- follow-up chips.

Example groups:
- "Рис"
- "Морковь"
- "Мясо"
- "Лук"
- "Масло"
- "Специи"

UI rule:
- show one best product per group first;
- "Ещё варианты" reveals more products;
- product cards show image, name, brand, price, stock label, and open-product action.

### Store Info

If the user asks "что за магазин", "где находится", "контакты", "как связаться", AI should answer from store fields and show contact actions if UI supports them.

If information is missing, say what is known and omit the rest.

### Safety And Honesty

Use practical, non-frightening wording:
- "По данным карточки товара: халал."
- "Состав в карточке не указан, поэтому проверьте упаковку."
- "Цена указана по каталогу магазина и может отличаться на кассе."

Do not make medical diagnoses or absolute safety guarantees.

## Internet Search For Product Data

V1 should not let live buyer chat freely browse the internet for product facts.

Reasons:
- latency;
- cost;
- unreliable sources;
- legal/safety risk;
- hard to cite and verify in Russian/Kazakh buyer flow;
- model may merge wrong product variants.

Better approach:
- chat uses trusted local product data;
- missing data creates a data-improvement signal;
- separate backend enrichment pipeline may use external sources and AI with review/quality flags;
- after enrichment, product facts become part of the catalog.

Allowed later:
- controlled enrichment job for missing products/composition;
- source confidence fields;
- visible "data source / last checked" metadata.

## Chat Persistence

Current behavior loses chat state on route changes/refresh. This is not pilot-quality.

Recommended V1 path:
- persist recent chat locally in browser storage/IndexedDB per `storeSlug` and mode;
- no server DB chat history in first version;
- keep privacy simpler and avoid storing personal food/allergy conversations server-side.

Keys:
- `korset_ai_chat_general_${storeSlug}`;
- `korset_ai_chat_product_${storeSlug}_${ean}`.

Store:
- messages;
- structured product groups;
- createdAt/updatedAt;
- model metadata like ragUsed if useful.

Limits:
- keep last 30 messages per chat;
- expire after 7-14 days;
- add "clear chat" action.

Later:
- account-synced chat history only after privacy design and user controls.

## Cost Control

Use `gpt-4.1-nano` for most buyer AI calls.

Cost controls:
- cap context size;
- retrieve only relevant catalog products;
- max output tokens around 400-800 for normal chat;
- structured product cards should use local catalog data, not model-generated verbose text;
- cache repeated store context;
- no live web search in buyer chat.

Escalation:
- only use stronger models for offline enrichment or admin-reviewed tasks, not every shopper chat.

## Retail AI Insights

Do not build a full retail AI chat in V1.

Add a dashboard block later:
"KORSET AI заметил"

Possible insights:
- frequent unknown EANs;
- popular searched needs;
- categories with weak data;
- products often scanned but out of stock;
- opportunities for alternatives.

This should use aggregate data only and avoid personal shopper data.

## Implementation Phases

### Phase 1: Buyer AI Foundation

- pass store context to AI endpoint;
- sanitize store/profile/catalog context;
- update prompts to store-aware formal tone;
- persist local chat sessions;
- update welcome and chips.

### Phase 2: Catalog-Grounded Product Cards

- add catalog retrieval/search for AI queries;
- return structured `productGroups`;
- render grouped cards in chat;
- support "more variants" per group.

### Phase 3: Product AI Upgrade

- fix product AI direct route/refresh;
- add store context, price, stock;
- add same-store alternatives;
- add honest missing-data language.

### Phase 4: Store Notes

- add `ai_store_notes` field;
- expose in Retail Settings or fill manually for pilot;
- include notes in AI context.

### Phase 5: Retail Insights

- add non-chat AI insights block in Retail Dashboard;
- derive from existing scans, unknown EANs, catalog quality, and stock signals.

## Open Questions

- Should demo stores be visibly marked as demo anywhere in UI, or only internally?
- Should `ai_store_notes` be editable by owner in V1 or manually managed by operator?
- What exact chat expiry is best: 7 days or 14 days?
- How many product alternatives per group should be sent to AI and rendered: 3 or 5?
- Should buyer AI require auth for higher limits, or allow anonymous low limits?

