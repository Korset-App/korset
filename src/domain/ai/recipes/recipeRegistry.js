import { GOLDEN_RECIPES } from './goldenRecipes.js'

const LEARNED_RECIPES_STORAGE_KEY = 'korset_learned_recipes_cache'

function normalizeQuery(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const STRIP_WORDS = new Set([
  'ингредиенты',
  'ингредиент',
  'продукты',
  'продукт',
  'товар',
  'товары',
  'собери',
  'соберите',
  'приготовь',
  'приготовить',
  'хочу',
  'сделай',
  'сделать',
  'что',
  'нужно',
  'надо',
  'купить',
  'список',
  'подобрать',
  'для',
  'на',
  'под',
  'жасау',
  'үшін',
  'құрамы',
  'тауарлар',
  'керек',
])

export function extractDishCoreTokens(query) {
  const words = normalizeQuery(query).split(' ')
  const filtered = words.filter((w) => w.length >= 2 && !STRIP_WORDS.has(w))
  return filtered.join(' ')
}

export function isRecipeIntent(query) {
  if (!query) return false
  const lower = String(query).toLowerCase()
  return (
    lower.includes('ингредиент') ||
    lower.includes('рецепт') ||
    lower.includes('собери продукты') ||
    lower.includes('что нужно для') ||
    lower.includes('что купить для') ||
    lower.includes('құрамы') ||
    Boolean(matchGoldenRecipe(query))
  )
}

/**
 * Searches the Golden Recipes Registry for a known match.
 * @param {string} query - Raw user query or dish name.
 * @returns {object|null} - Matched golden recipe or null.
 */
export function matchGoldenRecipe(query) {
  if (!query) return null
  const normalized = normalizeQuery(query)
  const core = extractDishCoreTokens(query)

  for (const recipe of GOLDEN_RECIPES) {
    if (recipe.id === normalized || recipe.id === core) return recipe

    for (const alias of recipe.aliases) {
      const normAlias = normalizeQuery(alias)
      if (
        normalized === normAlias ||
        core === normAlias ||
        normalized.includes(normAlias) ||
        core.includes(normAlias)
      ) {
        return recipe
      }
    }

    const titleRuNorm = normalizeQuery(recipe.title.ru)
    const titleKzNorm = normalizeQuery(recipe.title.kz)
    if (normalized.includes(titleRuNorm) || normalized.includes(titleKzNorm)) {
      return recipe
    }
  }

  // Check learned recipes from local cache
  const learned = getStoredLearnedRecipes()
  for (const recipe of Object.values(learned)) {
    if (recipe.id === normalized || recipe.id === core) return recipe
    for (const alias of recipe.aliases || []) {
      const normAlias = normalizeQuery(alias)
      if (
        normalized === normAlias ||
        core === normAlias ||
        normalized.includes(normAlias) ||
        core.includes(normAlias)
      ) {
        return recipe
      }
    }
    const titleRuNorm = normalizeQuery(recipe.title?.ru)
    const titleKzNorm = normalizeQuery(recipe.title?.kz)
    if (
      (titleRuNorm && (normalized.includes(titleRuNorm) || core.includes(titleRuNorm))) ||
      (titleKzNorm && (normalized.includes(titleKzNorm) || core.includes(titleKzNorm)))
    ) {
      return recipe
    }
  }

  return null
}

const inMemoryLearnedRecipes = {}

/**
 * Loads dynamically learned recipes from browser storage.
 */
export function getStoredLearnedRecipes() {
  if (typeof window === 'undefined' || !window.localStorage) return inMemoryLearnedRecipes
  try {
    const raw = window.localStorage.getItem(LEARNED_RECIPES_STORAGE_KEY)
    return raw ? JSON.parse(raw) : inMemoryLearnedRecipes
  } catch {
    return inMemoryLearnedRecipes
  }
}

/**
 * Caches a newly decomposed exotic/custom recipe into the learned registry.
 */
export function saveLearnedRecipe(recipe) {
  if (!recipe?.id || !Array.isArray(recipe?.roles) || recipe.roles.length < 2) return

  const cleanId = normalizeQuery(recipe.id).replace(/\s+/g, '_')
  const aliases = Array.from(
    new Set([
      ...(recipe.aliases || []),
      recipe.id,
      recipe.title?.ru,
      recipe.title?.kz,
    ])
  ).filter(Boolean)

  const item = {
    ...recipe,
    id: cleanId,
    learnedAt: Date.now(),
    aliases,
  }
  inMemoryLearnedRecipes[cleanId] = item

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const current = getStoredLearnedRecipes()
      current[cleanId] = item
      window.localStorage.setItem(LEARNED_RECIPES_STORAGE_KEY, JSON.stringify(current))
    } catch (_e) {
      // ignore storage quota error
    }
  }
}

/**
 * Returns top 3 curated dish quick choices for the minimalist dock.
 */
export function getCuratedQuickSuggestions(lang = 'ru') {
  return [
    {
      id: 'burger',
      emoji: '🍔',
      label: lang === 'kz' ? 'Үй бургері' : 'Бургеры',
      dish: 'Домашние бургеры',
    },
    {
      id: 'plov',
      emoji: '🍲',
      label: lang === 'kz' ? 'Палау' : 'Плов',
      dish: 'Классический плов',
    },
    {
      id: 'breakfast_oatmeal',
      emoji: '🍳',
      label: lang === 'kz' ? 'Таңғы ас' : 'Завтрак',
      dish: 'Завтрак',
    },
  ]
}
