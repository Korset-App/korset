// ═══════════════════════════════════════════════════════════════════════════
// API Monitoring Helpers — Sentry + Rate Limiting + Validation
// ═══════════════════════════════════════════════════════════════════════════
// Used by all Vercel serverless API endpoints for:
//   • Structured error tracking (Sentry)
//   • Rate limiting (in-memory Map, per-Vercel-function-instance)
//   • Input validation helpers
//   • Request timeout wrappers
//
// NOTE: In-memory rate limit resets on every cold start (Vercel function
//       redeploy / idle timeout). This is acceptable for Körset scale.
//       For stricter limits use Upstash Redis or Supabase rate_limit table.
// ═══════════════════════════════════════════════════════════════════════════

import * as Sentry from '@sentry/node'

// ── Sentry init (idempotent; safe to call multiple times) ─────────────────
const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
if (sentryDsn && !Sentry.getCurrentHub().getClient()) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'production',
    release: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    tracesSampleRate: 0,
    // Serverless: keep it light — no tracing, just errors + breadcrumbs
  })
}

// ── Rate Limiting ─────────────────────────────────────────────────────────

const rateLimitStore = new Map()

/**
 * Check rate limit for a key.
 * @param {string} key — e.g. `ip:${ip}` or `user:${userId}`
 * @param {{maxRequests:number, windowMs:number}} limit
 * @returns {{allowed:boolean, remaining:number}}
 */
export function checkRateLimit(key, limit) {
  const now = Date.now()
  const entry = rateLimitStore.get(key)
  if (!entry || now - entry.windowStart > limit.windowMs) {
    rateLimitStore.set(key, { windowStart: now, count: 1 })
    return { allowed: true, remaining: limit.maxRequests - 1 }
  }
  if (entry.count >= limit.maxRequests) {
    return { allowed: false, remaining: 0 }
  }
  entry.count++
  return { allowed: true, remaining: limit.maxRequests - entry.count }
}

/** Standard limits for external API proxies */
export const PROXY_RATE_LIMITS = {
  authenticated: { maxRequests: 60, windowMs: 60_000 },
  anonymous: { maxRequests: 15, windowMs: 60_000 },
}

/** Stricter limits for admin/ destructive endpoints */
export const ADMIN_RATE_LIMITS = {
  authenticated: { maxRequests: 20, windowMs: 60_000 },
}

/**
 * Get rate limit key from request.
 * @param {import('http').IncomingMessage} req
 * @param {{authenticated:boolean, user?:object}} auth
 * @returns {string}
 */
export function getRateLimitKey(req, auth) {
  if (auth?.authenticated && auth?.user?.id) {
    return `user:${auth.user.id}`
  }
  return `ip:${req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'}`
}

// ── Validation ──────────────────────────────────────────────────────────────

const EAN_REGEX = /^\d{8,14}$/

/** Validate EAN-8 / EAN-13 / UPC-A (8–14 digits) */
export function isValidEAN(ean) {
  if (!ean || typeof ean !== 'string') return false
  const cleaned = ean.trim()
  return EAN_REGEX.test(cleaned)
}

/** Sanitize string input: trim + truncate + strip control chars */
export function sanitizeString(value, maxLength = 200) {
  if (typeof value !== 'string') return ''
  return (
    value
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength)
  )
}

// ── Sentry helpers ──────────────────────────────────────────────────────────

/**
 * Capture exception + request context in Sentry.
 * Use in every API catch block.
 */
export function captureApiError(error, req, extraContext = {}) {
  if (!sentryDsn) {
    // Sentry not configured — fall back to console (Vercel logs)
    console.error('[monitoring] Sentry DSN not configured, logging to console:', error)
    return
  }
  Sentry.withScope((scope) => {
    scope.setContext('request', {
      url: req.url,
      method: req.method,
      headers: {
        'user-agent': req.headers['user-agent'],
        origin: req.headers.origin,
        'x-forwarded-for': req.headers['x-forwarded-for'],
      },
    })
    scope.setTags({
      endpoint: req.url?.split('?')[0] || 'unknown',
      vercel_region: process.env.VERCEL_REGION || 'unknown',
    })
    if (extraContext.userId) scope.setUser({ id: extraContext.userId })
    Sentry.captureException(error)
  })
}

/** Set breadcrumb for request lifecycle tracking */
export function addBreadcrumb(message, category, data = {}) {
  if (!sentryDsn) return
  Sentry.addBreadcrumb({ message, category, data, level: 'info' })
}

// ── Timeout wrapper ───────────────────────────────────────────────────────

/**
 * Fetch with AbortSignal.timeout (Node 18+) + Sentry breadcrumb.
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  addBreadcrumb('External API request', 'http', { url: url.slice(0, 200) })
  try {
    const response = await fetch(url, {
      ...options,
      // eslint-disable-next-line no-undef
      signal: AbortSignal.timeout(timeoutMs),
    })
    addBreadcrumb('External API response', 'http', {
      url: url.slice(0, 200),
      status: response.status,
    })
    return response
  } catch (err) {
    addBreadcrumb('External API error', 'http', {
      url: url.slice(0, 200),
      error: err.name || err.message,
    })
    throw err
  }
}
