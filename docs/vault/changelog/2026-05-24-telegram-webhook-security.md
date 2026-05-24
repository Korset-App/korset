# Telegram Webhook Security — Verification Implementation

## What was done

Telegram Support Bot webhook endpoint (`api/telegram-webhook.js`) now cryptographically verifies that incoming requests originate from Telegram, not from an impersonator.

## Problem

The webhook endpoint accepted any POST request without source verification. An attacker who knows the URL could:
- Create fake support tickets
- Close other users' tickets
- Send fake operator responses
- Spam the operator chat

Since Telegram webhook URLs are discoverable (set via the public `setWebhook` API), URL secrecy is not a viable defense.

## Solution

Implemented the standard Telegram Bot API `secret_token` mechanism:

1. **`src/telegram-bot/verifyWebhook.js`** — pure function using `crypto.timingSafeEqual` for constant-time secret comparison. Resists timing side-channel attacks where an attacker measures response time to guess the secret byte-by-byte.

2. **`api/telegram-webhook.js`** — added verification at the handler entry point, before any request processing:
   - Reads `TELEGRAM_WEBHOOK_SECRET` from environment
   - Compares against `X-Telegram-Bot-Api-Secret-Token` header
   - Returns 401 if header is missing or doesn't match
   - Returns 500 if the secret is not configured at all
   - GET health endpoint now reports `webhookSecret: true/false`

3. **`scripts/setup-telegram-webhook.mjs`** — atomic script to register the webhook with `secret_token`:
   - Uses `TELEGRAM_SUPPORT_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` from `.env.local`
   - Supports `--dry-run` for inspection without API call
   - Supports `--url=` override for custom URLs
   - Default URL: `https://korset.vercel.app/api/telegram-webhook`

4. **`tests/unit/telegramWebhookAuth.test.mjs`** — 8 tests covering valid match, mismatch, missing header, unconfigured secret, and timing-safe comparison resistance.

## Deployment order (no-downtime risk)

1. Generate `TELEGRAM_WEBHOOK_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Add `TELEGRAM_WEBHOOK_SECRET` to Vercel Environment Variables
3. Deploy the code → bot goes down (all requests return 401 until webhook is re-registered with secret)
4. Immediately run: `node scripts/setup-telegram-webhook.mjs`
5. Bot is back online with HTTP 200 responses

Expected downtime: ~10 seconds between deploy and webhook re-registration.

## Files

- `src/telegram-bot/verifyWebhook.js` — new
- `api/telegram-webhook.js` — modified (3 edits)
- `scripts/setup-telegram-webhook.mjs` — new
- `tests/unit/telegramWebhookAuth.test.mjs` — new

## Verification

- Unit tests: 8/8 PASS (targeted), 381/382 total (1 pre-existing failure in alternatives.test.mjs, unrelated)
- Lint: 80 warnings, 0 errors (no regressions)
- Build: PASS
