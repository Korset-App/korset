const MINUTE = 60 * 1000

function freshness(timestamp, now, maxAge) {
  if (!timestamp) return 'unknown'
  const value = Date.parse(timestamp)
  if (!Number.isFinite(value) || value > now + 5 * MINUTE) return 'unknown'
  return now - value <= maxAge ? 'recent' : 'stale'
}

export function getIntegrationHealth(integration, now = Date.now()) {
  if (!integration)
    return { state: 'unconfigured', connection: 'unknown', data: 'unknown', healthy: false }
  const state = ['active', 'paused', 'revoked'].includes(integration.status)
    ? integration.status
    : 'unknown'
  const connection = freshness(integration.last_seen_at, now, 15 * MINUTE)
  const data = freshness(integration.last_applied_at, now, 30 * MINUTE)
  return {
    state,
    connection,
    data,
    healthy:
      state === 'active' &&
      connection === 'recent' &&
      data === 'recent' &&
      !integration.last_error_code,
  }
}
