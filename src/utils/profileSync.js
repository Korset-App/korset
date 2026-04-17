/**
 * profileSync.js
 * Pure utility for detecting and resolving profile preference conflicts
 * between local (localStorage) and cloud (Supabase) sources.
 */

/** localStorage key to track which auth user has already resolved their sync. */
export const SENTINEL_KEY = 'korset_profile_synced_uid'

/**
 * Returns true if the profile has no meaningful preferences configured.
 * Used to detect "new user" / "fresh install" scenarios where no conflict can exist.
 */
export function isDefaultPreferences(profile) {
  if (!profile) return true
  return (
    (profile.allergens?.length ?? 0) === 0 &&
    (profile.dietGoals?.length ?? 0) === 0 &&
    (profile.customAllergens?.length ?? 0) === 0 &&
    !profile.halal
  )
}

/**
 * Returns true if the auth user has already resolved their sync conflict
 * and has the sentinel key persisted in localStorage.
 */
export function isAlreadySynced(authUid) {
  if (!authUid) return false
  try {
    return localStorage.getItem(SENTINEL_KEY) === authUid
  } catch {
    return false
  }
}

/**
 * Marks sync as resolved for this auth user.
 * After this, conflict detection is skipped on future logins.
 */
export function markSyncComplete(authUid) {
  if (!authUid) return
  try {
    localStorage.setItem(SENTINEL_KEY, authUid)
  } catch {
    /* quota exceeded */
  }
}

/**
 * Clears the sync sentinel (e.g. after user resets preferences or for testing).
 */
export function clearSyncSentinel() {
  try {
    localStorage.removeItem(SENTINEL_KEY)
  } catch {
    /* unavailable */
  }
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function setEqual(a, b) {
  const setA = new Set(a ?? [])
  const setB = new Set(b ?? [])
  if (setA.size !== setB.size) return false
  for (const item of setA) {
    if (!setB.has(item)) return false
  }
  return true
}

// ─── Core conflict detection ─────────────────────────────────────────────────

/**
 * Detects conflicts between local and cloud profile preferences.
 *
 * A conflict exists ONLY when BOTH sides have non-empty, differing data.
 * If either side is empty/default, no conflict is reported (the non-empty side wins silently).
 *
 * @param {Object} local  - Normalized local profile from localStorage
 * @param {Object} cloud  - Normalized cloud profile from Supabase
 * @returns {{ hasConflict: boolean, diff: Object }}
 */
export function detectProfileConflict(local, cloud) {
  const lAllergens = local?.allergens ?? []
  const cAllergens = cloud?.allergens ?? []
  const lDiet = local?.dietGoals ?? []
  const cDiet = cloud?.dietGoals ?? []
  const lCustom = local?.customAllergens ?? []
  const cCustom = cloud?.customAllergens ?? []
  const lHalal = Boolean(local?.halal)
  const cHalal = Boolean(cloud?.halal)

  // Conflict only if BOTH sides are non-empty AND they differ
  const allergensConflict =
    lAllergens.length > 0 && cAllergens.length > 0 && !setEqual(lAllergens, cAllergens)
  const dietConflict = lDiet.length > 0 && cDiet.length > 0 && !setEqual(lDiet, cDiet)
  const customConflict = lCustom.length > 0 && cCustom.length > 0 && !setEqual(lCustom, cCustom)
  // Halal conflicts only if one is true and the other is false (and at least one is set)
  const halalConflict = (lHalal || cHalal) && lHalal !== cHalal

  return {
    hasConflict: allergensConflict || dietConflict || customConflict || halalConflict,
    diff: {
      allergens: { local: lAllergens, cloud: cAllergens, hasConflict: allergensConflict },
      dietGoals: { local: lDiet, cloud: cDiet, hasConflict: dietConflict },
      customAllergens: { local: lCustom, cloud: cCustom, hasConflict: customConflict },
      halal: { local: lHalal, cloud: cHalal, hasConflict: halalConflict },
    },
  }
}

// ─── Merge strategy ──────────────────────────────────────────────────────────

/**
 * Merges two profiles using a union strategy for preference arrays.
 *
 * Rules:
 * - allergens, dietGoals, customAllergens: UNION (Set)
 * - halal: OR (more restrictive is safer for health)
 * - notifications, privacy: local wins (current device settings preferred)
 * - All other config (priority, lang, etc.): local wins
 *
 * @param {Object} local
 * @param {Object} cloud
 * @returns {Object} merged profile (NOT normalized — call normalizeProfile on the result)
 */
export function mergeProfiles(local, cloud) {
  return {
    // Cloud as base, then local overrides non-preference config
    ...cloud,
    ...local,
    // Preference arrays: union
    allergens: [...new Set([...(local.allergens ?? []), ...(cloud.allergens ?? [])])],
    dietGoals: [...new Set([...(local.dietGoals ?? []), ...(cloud.dietGoals ?? [])])],
    customAllergens: [
      ...new Set([...(local.customAllergens ?? []), ...(cloud.customAllergens ?? [])]),
    ],
    // Boolean flags: take more restrictive value
    halal: Boolean(local.halal) || Boolean(cloud.halal),
    // Config objects: local wins but fill gaps from cloud
    notifications: { ...(cloud.notifications ?? {}), ...(local.notifications ?? {}) },
    privacy: { ...(cloud.privacy ?? {}), ...(local.privacy ?? {}) },
  }
}
