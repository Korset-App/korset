import { searchStoreProductsRPC } from '../../product/search.js'

/**
 * Checks if a product violates user profile allergens.
 */
function hasProfileAllergen(product, profile) {
  const userAllergens = profile?.allergens || []
  if (!userAllergens.length) return false

  const productAllergens = product.allergens || []
  const hasDirectAllergen = productAllergens.some((allergen) => {
    const norm = String(allergen).replace(/^en:/, '').toLowerCase()
    return userAllergens.some((ua) => ua.toLowerCase() === norm || norm.includes(ua.toLowerCase()))
  })
  if (hasDirectAllergen) return true

  // Check ingredient text if available
  if (product.ingredients) {
    const ingLower = String(product.ingredients).toLowerCase()
    for (const allergen of userAllergens) {
      if (ingLower.includes(allergen.toLowerCase())) return true
    }
  }

  return false
}

/**
 * Scores and ranks candidate products for a specific recipe role.
 */
function scoreProductForRole(product, role, profile, budgetPerRole) {
  let score = 100

  // 1. Category relevance
  if (role.category && product.category === role.category) {
    score += 80
  } else if (role.category && product.category !== role.category) {
    score -= 60
  }

  // Strictly eliminate excluded categories (e.g. sweets for buns)
  if (role.excludeCategories?.includes(product.category)) {
    return -9999
  }

  // 2. Stock status
  if (product.stockStatus === 'in_stock') score += 40
  if (product.stockStatus === 'low_stock') score += 10
  if (product.stockStatus === 'out_of_stock') score -= 200

  // 3. Halal preference
  if (profile?.halal) {
    if (product.halalStatus === 'yes') score += 50
    if (product.halalStatus === 'no') score -= 300
  }

  // 4. Budget fit
  const price = Number(product.priceKzt)
  if (Number.isFinite(price) && price > 0 && budgetPerRole > 0) {
    if (price <= budgetPerRole) {
      score += 30 + Math.round(((budgetPerRole - price) / budgetPerRole) * 20)
    } else {
      score -= Math.min(60, Math.round(((price - budgetPerRole) / budgetPerRole) * 40))
    }
  }

  // 5. Image presence
  if (product.image) score += 15

  return score
}

const withTimeout = (promise, ms = 2500) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('rpc_timeout')), ms)),
  ])

/**
 * Searches and organizes products for each role in a recipe.
 *
 * @param {object} params
 * @param {string} params.storeId - UUID of the current active store
 * @param {object} params.recipe - Recipe object with roles
 * @param {object} [params.profile] - User profile (allergens, halal)
 * @param {number|null} [params.budget] - Total budget in KZT
 * @param {number} [params.maxProductsPerRole=5] - Number of candidate products per role
 * @param {AbortSignal} [params.signal] - Optional abort signal
 * @returns {Promise<Array>} - Array of role sections with matched products and preselection
 */
export async function matchProductsForRecipe({
  storeId,
  recipe,
  profile = null,
  budget = null,
  maxProductsPerRole = 5,
  signal = null,
}) {
  if (!storeId || !recipe?.roles?.length || signal?.aborted) return []

  const budgetPerRole = budget && budget > 0 ? Math.round(budget / recipe.roles.length) : null

  // Fetch candidates for all roles in parallel with timeout guard
  const rolePromises = recipe.roles.map(async (role) => {
    if (signal?.aborted) return null

    const rawCandidates = []
    const seenEans = new Set()
    const terms = (role.queryTerms && role.queryTerms.length > 0)
      ? role.queryTerms.slice(0, 2)
      : [role.title?.ru || role.id]

    for (const term of terms) {
      if (signal?.aborted) break
      try {
        const results = await withTimeout(searchStoreProductsRPC(storeId, term, { limit: 10 }), 2500)
        for (const item of results) {
          if (!seenEans.has(item.ean)) {
            seenEans.add(item.ean)
            rawCandidates.push(item)
          }
        }
        if (rawCandidates.length >= 6) break
      } catch (_e) {
        // Continue to next term if RPC times out or fails
      }
    }

    if (signal?.aborted) return null

    // Filter and score candidates
    const validCandidates = rawCandidates.filter((product) => {
      if (!product?.ean || !product?.name) return false
      if (hasProfileAllergen(product, profile)) return false
      if (role.excludeCategories?.includes(product.category)) return false
      return true
    })

    const scored = validCandidates
      .map((product) => ({
        product,
        score: scoreProductForRole(product, role, profile, budgetPerRole),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)

    const topProducts = scored.slice(0, maxProductsPerRole).map((item) => item.product)
    const selectedEan = topProducts[0]?.ean || null

    return {
      roleId: role.id,
      title: role.title,
      category: role.category,
      required: role.required !== false,
      products: topProducts,
      selectedEan,
      hasMore: rawCandidates.length > maxProductsPerRole,
      totalFound: rawCandidates.length,
    }
  })

  const results = await Promise.allSettled(rolePromises)
  if (signal?.aborted) return []

  return results
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value)
}
