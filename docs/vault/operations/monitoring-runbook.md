# Monitoring & Alerting Runbook — Körset

> **Status:** 2026-05-01 — production monitoring stack configured.
> **Owner:** DevOps / Product lead.
> Связи: [[assistant-access-and-architecture-governance]] · [[2026-05-01-idx-sentry-views]]

## Stack

| Tool | Purpose | URL / Access |
|------|---------|-------------|
| **Sentry** | Error tracking (frontend + backend) | https://korset.sentry.io |
| **Vercel** | Hosting, logs, Analytics | https://vercel.com/dashboard |
| **Supabase** | DB health, slow queries | https://supabase.com/dashboard |
| **UptimeRobot** | /api/health ping (free tier) | https://uptimerobot.com |

## Health Check

- **Endpoint:** `GET https://korset.app/api/health`
- **Expected:** HTTP 200 + `{ status: "ok", checks: { ... } }`
- **Ping interval:** 5 minutes (UptimeRobot)
- **Alert channels:** Email → Telegram bot (UptimeRobot)

### Health Response Fields

```json
{
  "status": "ok|degraded|down",
  "timestamp": "2026-05-01T...",
  "durationMs": 45,
  "version": "a1b2c3d",
  "region": "fra1",
  "checks": {
    "supabase": { "status": "ok", "latencyMs": 23 },
    "openai": { "configured": true },
    "rag": { "configured": true },
    "push": { "configured": true, "vapidPublic": true, "vapidPrivate": true },
    "sentry": { "configured": true, "release": "a1b2c3d" }
  }
}
```

### Interpretation

| status | Meaning | Action |
|--------|---------|--------|
| `ok` (200) | All critical services up | None |
| `degraded` (503) | Supabase + OpenAI ok, but RAG/Push/Sentry missing | Non-critical: check env vars, fix at convenience |
| `down` (503) | Supabase down OR OpenAI key missing | **CRITICAL:** investigate immediately |

## Sentry Setup

### DSN (Client — safe to expose)

```
VITE_SENTRY_DSN=https://<public_key>@o<org>.ingest.sentry.io/<project_id>
```

Set in **Vercel Environment Variables** → Production.

### Server DSN (API — keep secret)

```
SENTRY_DSN=https://<public_key>:<secret_key>@o<org>.ingest.sentry.io/<project_id>
```

Set in **Vercel Environment Variables** → Production.

### What We Track

| Layer | Events |
|-------|--------|
| Frontend | React errors (ErrorBoundary), console errors, unhandled rejections |
| API | 500 errors, unhandled exceptions, external API failures |
| Performance | Web Vitals (Vercel Analytics), Sentry traces (sampled 10%) |

### Telegram Alerts (Primary — instant push notifications)

**Setup:**
1. Bot: @BotFather → `/newbot` → `korset_alerts_bot` → save token
2. Chat ID: Message bot `/start` → check `https://api.telegram.org/bot<TOKEN>/getUpdates` → extract `chat.id`
3. Vercel env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID`
4. Sentry: Settings → Alerts → Create Rule → Webhook → `https://korset.app/api/sentry-webhook`

**Alert Rules:**
| Rule | Trigger | Frequency | Message |
|------|---------|-----------|---------|
| New Issue | Any new error | Each issue | 🚨 Error title + culprit + Sentry URL |
| Spike | >10 events / 1h | Max 1 per 30min | 💥 Error + event count + user count |

**Environment Variables:**
```
TELEGRAM_BOT_TOKEN=8607158022:AAGcqjuIKLNJ17asgp1FswZbZkM5jN3Qe7I
TELEGRAM_ALERT_CHAT_ID=1003080635
```

**Endpoint:** `POST https://korset.app/api/sentry-webhook`
- Formats Sentry JSON → MarkdownV2 Telegram message
- Handles both Issue Alert and Event formats
- Returns 200 even if Telegram fails (prevents Sentry retry loops)

## Common Issues & Playbook

### 1. `/api/health` returns `degraded`

**Symptoms:** `checks.rag.configured: false` or `checks.push.configured: false`

**Diagnosis:**
```bash
curl https://korset.app/api/health
```

**Resolution:**
- Check Vercel env vars: `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- Redeploy if env vars added

### 2. Sentry not receiving errors

**Symptoms:** 0 issues in Sentry dashboard

**Diagnosis:**
```bash
# Check DSN configured
curl https://korset.app/api/health | jq .checks.sentry
```

**Resolution:**
- Verify `VITE_SENTRY_DSN` in Vercel Production env
- Check browser console: `Sentry.getCurrentHub().getClient()` should return object
- For API: verify `SENTRY_DSN` env var

### 3. Rate limit 429 on AI

**Symptoms:** Users see "Too many requests"

**Diagnosis:**
```
# Check rate limit headers in response
X-RateLimit-Remaining: 0
```

**Resolution:**
- Normal: user exceeded 30 req/min (authenticated) or 8 req/min (anonymous)
- Abnormal: check Sentry for `rate_limit_exceeded` errors
- If attack: consider adding Cloudflare rate limiting or Upstash Redis

### 4. Supabase slow queries

**Symptoms:** API latency > 2s

**Diagnosis:**
- Supabase Dashboard → Database → Reports → Query Performance
- Check for missing indexes: `pg_indexes` on `users(auth_id)`, `scan_events(store_id, scanned_at)`

**Resolution:**
- Apply pending migrations: `supabase/migrations/022_idx_users_auth_id.sql`
- Add indexes if new slow queries appear

### 5. OFF/USDA API failures

**Symptoms:** Products not found, scan shows "Unknown product"

**Diagnosis:**
```bash
curl "https://korset.app/api/off?ean=1234567890123"
curl "https://korset.app/api/health"
# Check checks.openai.configured (AI enrichment fallback)
```

**Resolution:**
- External APIs (OFF/USDA) may be down — check their status pages
- Fallback: AI enrichment still works if OpenAI key is configured
- Log in Sentry: `External API unavailable` errors

## Env Variables Checklist

### Production (Vercel)

| Variable | Required | Where Used |
|----------|----------|-----------|
| `SUPABASE_URL` | ✅ | All API + frontend |
| `SUPABASE_ANON_KEY` | ✅ | All API + frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Admin API, RAG |
| `OPENAI_API_KEY` | ✅ | /api/ai, enrichment |
| `USDA_API_KEY` | ⚠️ | /api/usda (optional) |
| `VITE_SENTRY_DSN` | ⚠️ | Frontend error tracking |
| `SENTRY_DSN` | ⚠️ | API error tracking |
| `SENTRY_AUTH_TOKEN` | ⚠️ | Source maps upload in CI |
| `VAPID_PUBLIC_KEY` | ⚠️ | Push notifications |
| `VAPID_PRIVATE_KEY` | ⚠️ | Push notifications |
| `PUSH_INTERNAL_TOKEN` | ⚠️ | Internal push API auth |
| `VERCEL_GIT_COMMIT_SHA` | Auto | Release tracking |

## Escalation

| Severity | Response Time | Who |
|----------|--------------|-----|
| **P0** — App down (health 503) | 15 min | Developer |
| **P1** — Errors > 10/hour in Sentry | 1 hour | Developer |
| **P2** — Degraded (missing non-critical service) | 4 hours | Developer |
| **P3** — Single user issue, data quality | 24 hours | Support |
