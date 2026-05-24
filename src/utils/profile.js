import { ALLERGEN_MIGRATION_MAP } from '../constants/allergens.js'

const STORAGE_KEY = 'korset_profile'

export const DEFAULT_PROFILE = {
  presetId: null,
  halal: false,
  halalOnly: false,
  halalStrict: false,
  allergens: [],
  customAllergens: [],
  dietGoals: [],
  healthConditions: [], // NEW: ['diabetes', 'celiac', 'pku']
  sugarFree: false,
  priority: 'balanced',
}

export const ALLERGEN_OPTIONS = [
  { id: 'milk', label: 'Молоко и лактоза' },
  { id: 'eggs', label: 'Яйца' },
  { id: 'gluten', label: 'Глютен' },
  { id: 'peanuts', label: 'Арахис' },
  { id: 'tree_nuts', label: 'Орехи' },
  { id: 'soy', label: 'Соя' },
  { id: 'fish', label: 'Рыба' },
  { id: 'crustaceans', label: 'Ракообразные' },
  { id: 'sesame', label: 'Кунжут' },
  { id: 'celery', label: 'Сельдерей' },
  { id: 'mustard', label: 'Горчица' },
  { id: 'sulfites', label: 'Сульфиты' },
  { id: 'mollusks', label: 'Моллюски' },
  { id: 'lupin', label: 'Люпин' },
]

export const ALLERGEN_NAMES = {
  milk: 'Молоко и лактоза',
  eggs: 'Яйца',
  gluten: 'Глютен',
  peanuts: 'Арахис',
  tree_nuts: 'Орехи',
  soy: 'Соя',
  fish: 'Рыба',
  crustaceans: 'Ракообразные',
  sesame: 'Кунжут',
  celery: 'Сельдерей',
  mustard: 'Горчица',
  sulfites: 'Сульфиты',
  mollusks: 'Моллюски',
  lupin: 'Люпин',
  // Устаревшие (для обратной совместимости в UI)
  nuts: 'Орехи',
  shellfish: 'Морепродукты',
  wheat: 'Пшеница',
  honey: 'Мёд',
}

/**
 * Мигрирует старые ID аллергенов на новые (ТР ТС 022/2011).
 * nuts → tree_nuts, shellfish → crustaceans, honey → удаляется (в customAllergens)
 */
function migrateAllergenIds(allergens) {
  if (!Array.isArray(allergens)) return []
  const migrated = []
  const removedToCustom = []

  for (const id of allergens) {
    if (id in ALLERGEN_MIGRATION_MAP) {
      const newId = ALLERGEN_MIGRATION_MAP[id]
      if (newId) {
        migrated.push(newId)
      } else {
        // honey и подобные → переносим в customAllergens
        removedToCustom.push(id === 'honey' ? 'Мёд' : id)
      }
    } else {
      migrated.push(id)
    }
  }

  return { allergens: [...new Set(migrated)], addToCustom: removedToCustom }
}

export function normalizeDietGoals(dietGoals) {
  if (!Array.isArray(dietGoals)) return []
  return [
    ...new Set(dietGoals.map((id) => (id === 'dairy_free' ? 'lactose_free' : id)).filter(Boolean)),
  ]
}

export function loadProfile() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)

      // Мигрируем старые ID аллергенов
      const rawAllergens = Array.isArray(parsed.allergens) ? parsed.allergens : []
      const { allergens: migratedAllergens, addToCustom } = migrateAllergenIds(rawAllergens)

      const existingCustom = Array.isArray(parsed.customAllergens) ? parsed.customAllergens : []
      const mergedCustom = [...new Set([...existingCustom, ...addToCustom])]

      return {
        ...DEFAULT_PROFILE,
        ...parsed,
        halal: Boolean(parsed.halal || parsed.halalOnly),
        halalOnly: Boolean(parsed.halal || parsed.halalOnly),
        halalStrict: Boolean(parsed.halalStrict),
        allergens: migratedAllergens,
        customAllergens: mergedCustom,
        dietGoals: normalizeDietGoals(parsed.dietGoals),
        healthConditions: Array.isArray(parsed.healthConditions) ? parsed.healthConditions : [],
      }
    }
  } catch {
    /* ignore parse errors */
  }
  return { ...DEFAULT_PROFILE }
}

export function saveProfile(profile) {
  try {
    // Убеждаемся что allergens мигрированы перед сохранением
    const { allergens: migratedAllergens } = migrateAllergenIds(
      Array.isArray(profile.allergens) ? profile.allergens : []
    )

    const normalized = {
      ...DEFAULT_PROFILE,
      ...profile,
      halal: Boolean(profile.halal || profile.halalOnly),
      halalOnly: Boolean(profile.halal || profile.halalOnly),
      halalStrict: Boolean(profile.halalStrict),
      sugarFree: Boolean(profile.sugarFree || (profile.dietGoals || []).includes('sugar_free')),
      allergens: [...new Set(migratedAllergens)],
      customAllergens: Array.isArray(profile.customAllergens)
        ? [...new Set(profile.customAllergens)]
        : [],
      dietGoals: normalizeDietGoals(profile.dietGoals),
      healthConditions: Array.isArray(profile.healthConditions)
        ? [...new Set(profile.healthConditions)]
        : [],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    /* ignore storage errors */
  }
}

export function applyPreset(presetId) {
  const presets = {
    halal: { ...DEFAULT_PROFILE, presetId, halal: true, halalOnly: true },
    sugar_free: { ...DEFAULT_PROFILE, presetId, dietGoals: ['sugar_free'], sugarFree: true },
    lactose_free: { ...DEFAULT_PROFILE, presetId, dietGoals: ['lactose_free'] },
    dairy_free: { ...DEFAULT_PROFILE, presetId, dietGoals: ['lactose_free'] },
  }
  return presets[presetId] || { ...DEFAULT_PROFILE }
}
