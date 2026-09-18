# AGENTS.md — Körset

Agent behavior rules. Kept deliberately short: this file is injected into **every**
request, and long instruction files get followed less reliably than short ones.
Extended version: `docs/vault/knowledge/agent-operating-rules-full.md`

## Communication

- Talk to the user in **Russian**. Code, identifiers, commit messages and comments in English.
- Whenever an English technical term appears, add a short Russian explanation next to it.
  Always, without being asked — the user is not required to know the jargon.
- Be direct and honest. No flattery, no over-agreeing. State uncertainty. Disagree when
  the user is wrong, and admit your own mistakes plainly.

## Product

Körset is a mobile-first PWA for offline grocery stores in Kazakhstan. A shopper scans a
barcode inside a specific store and gets a Fit-Check: allergies, halal status, diets,
product facts.

Business model is B2B2C — stores pay for the SaaS, shoppers use the consumer flow.
Judge product decisions by B2B value: does this help sell or retain store subscriptions?

V1 scope is **grocery stores only**. No pharmacy, electronics, construction,
alcohol/tobacco, or generic marketplace flows unless the user explicitly changes scope.

## Stack — do not substitute

React 18 + Vite · JavaScript, **not** TypeScript · vanilla CSS, **not** Tailwind ·
Supabase (Postgres, Auth, Storage, RLS) · Vercel Serverless · OpenAI

## UI rules

- Consumer screens live under `/s/:storeSlug/`.
- Mobile-first and store-context-first. Both dark and light themes are required.
- Use existing CSS variables. Never hardcode `#fff`, `#000`, or raw white/black
  transparency for core surfaces or text.
- No gradient-filled text in core typography, titles, labels, or navigation.
- New user-facing text goes through `useI18n` with RU **and** KZ coverage.
- Avatars use `<ProfileAvatar />`.
- Categories and departments across all screens MUST use the single source of truth from `categoryMap.js` (via `getCategoryLabel`). Never hardcode or invent separate names.
- Premium, serious-brand quality. No generic or decorative filler.

## Ask before acting

Stop and ask before: major UI redesign · architecture change · DB schema, RLS or auth
change · data-pipeline change · product-scope change · destructive commands · anything
touching production data.

Also stop when requirements are ambiguous and guessing would affect behavior, data,
security, or business logic. Do **not** stop for details safely inferable from existing code.

## Safety

- Supabase, RLS, auth and migrations are high-risk. Never weaken a security check to
  make a feature pass.
- Never expose service-role keys or secrets to the client.
- For DB/API changes, check every consumer: screens, utilities, tests, RLS policies,
  migrations, seed/import scripts.
- Never run `vercel --prod` manually. Production deploys go through the owner's
  GitHub → Vercel flow after push.

## Code

- Keep changes surgical — every changed line traces back to the task.
- Match existing patterns. Do not refactor, rename, or reformat adjacent code.
- No comments by default. Add a short English comment only for a non-obvious invariant,
  security concern, platform workaround, or migration risk.

## Memory

- Start by reading `docs/CONTEXT.md`, then search narrowly for the task area.
- Query the vault only when project memory is actually needed:
  `node scripts/query-vault.mjs "query" --domain architecture|knowledge|decisions|plans`
- Never read the whole repository to "understand everything". Build the smallest
  sufficient map for the task.
- `docs/CONTEXT.md` is fast-start context, under 250 lines, and is **never** a changelog.
- Durable knowledge → `docs/vault/{knowledge,architecture,decisions}/`.
  Session logs → `docs/vault/changelog/` (not indexed for RAG).
- Run `npm run memory:save` after vault changes.

## Verification

Pick by risk: `npm run check:agent` (quick) · `check:agent:ui` (UI/i18n/lint/build) ·
`check:agent:full` (pre-handoff) · `npm run build` · `npm run lint` · `npm run test:unit` ·
`node scripts/check-i18n.mjs` when text changes.

Never present unverified work as verified. If a check could not run, say why.

## Cost discipline

Tokens are a real budget. Read files narrowly instead of whole. Use the `explore`
subagent for codebase search — its context never enters the main chat. Prefer one task
per session over one endless chat.
