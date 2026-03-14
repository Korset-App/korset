const STORAGE_KEY = 'korset_profile'

export const DIET_GOAL_OPTIONS = [
  { id: 'sugar_free', label: 'Без сахара', tone: 'violet' },
  { id: 'dairy_free', label: 'Без лактозы', tone: 'blue' },
  { id: 'gluten_free', label: 'Без глютена', tone: 'amber' },
  { id: 'vegan', label: 'Веган', tone: 'green' },
  { id: 'vegetarian', label: 'Вегетарианец', tone: 'green' },
]

export const ALLERGEN_OPTIONS = [
  { id: 'milk', label: 'Молоко' },
  { id: 'gluten', label: 'Глютен' },
  { id: 'nuts', label: 'Орехи' },
  { id: 'peanuts', label: 'Арахис' },
  { id: 'soy', label: 'Соя' },
  { id: 'eggs', label: 'Яйца' },
  { id: 'fish', label: 'Рыба' },
  { id: 'shellfish', label: 'Моллюски' },
]

export const PRIORITY_OPTIONS = [
  { id: 'balanced', label: 'Баланс', desc: 'Лучшее сочетание цены и качества' },
  { id: 'quality', label: 'Качество', desc: 'Сначала лучший состав' },
  { id: 'price', label: 'Цена', desc: 'Сначала более выгодные варианты' },
]

export const ALLERGEN_NAMES = {
  milk: 'Молоко',
  gluten: 'Глютен',
  nuts: 'Орехи',
  peanuts: 'Арахис',
  soy: 'Соя',
  eggs: 'Яйца',
  fish: 'Рыба',
  shellfish: 'Моллюски',
  wheat: 'Пшеница',
}

export const DEFAULT_PROFILE = {
  lang: 'ru',
  name: '',
  halal: false,
  halalOnly: false,
  allergens: [],
  customAllergens: [],
  dietGoals: [],
  sugarFree: false,
  priority: 'balanced',
}

export const PRESETS = []
export function applyPreset() {
  return { ...DEFAULT_PROFILE }
}

function dedupe(list = []) {
  return [...new Set((Array.isArray(list) ? list : []).filter(Boolean))]
}

export function normalizeProfile(raw = {}) {
  const dietGoals = dedupe([
    ...(raw.dietGoals || []),
    ...(raw.sugarFree ? ['sugar_free'] : []),
  ])

  const normalized = {
    ...DEFAULT_PROFILE,
    ...raw,
    halal: Boolean(raw.halal || raw.halalOnly),
    allergens: dedupe(raw.allergens),
    customAllergens: dedupe(raw.customAllergens),
    dietGoals,
    priority: PRIORITY_OPTIONS.some((item) => item.id === raw.priority) ? raw.priority : 'balanced',
  }

  normalized.halalOnly = normalized.halal
  normalized.sugarFree = normalized.dietGoals.includes('sugar_free')
  return normalized
}

export function loadProfile() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return { ...DEFAULT_PROFILE }
    return normalizeProfile(JSON.parse(saved))
  } catch {
    return { ...DEFAULT_PROFILE }
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeProfile(profile)))
  } catch {}
}
