// Pure helpers for recovering from stale-deploy chunk load failures.
// Dependency-injectable so unit tests never touch real sessionStorage.

// Assembled from parts on purpose: keep the literal in one piece in transit.
const DEFAULT_KEY = 'korset' + ':chunk' + 'Reload' + 'At'
const DEFAULT_WINDOW_MS = 60_000

const CHUNK_ERROR_PATTERNS = [
  'error loading dynamically imported module',
  'importing a module script failed',
  'failed to fetch dynamically imported module',
]

export function isChunkLoadError(error) {
  if (error == null) return false
  const parts = [typeof error === 'string' ? null : error?.message, error]
  const haystack = parts
    .map((part) => (part == null ? '' : String(part)))
    .join(' ')
    .toLowerCase()
  if (!haystack) return false
  return CHUNK_ERROR_PATTERNS.some((pattern) => haystack.includes(pattern))
}

export function canAutoReloadNow(storage, nowMs, opts = {}) {
  if (!storage || typeof storage.getItem !== 'function') return false
  const key = opts.key || DEFAULT_KEY
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS
  const raw = storage.getItem(key)
  if (raw == null || raw === '') return true
  const prev = Number(raw)
  if (!Number.isFinite(prev) || prev <= 0) return true
  return nowMs - prev >= windowMs
}

export function markAutoReload(storage, nowMs, opts = {}) {
  if (!storage || typeof storage.setItem !== 'function') return
  const key = opts.key || DEFAULT_KEY
  storage.setItem(key, String(nowMs))
}
