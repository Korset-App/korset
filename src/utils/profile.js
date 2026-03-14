export const PRESETS = [
  {
    id: 'halal-milk',
    name: 'Халал + без молока',
    emoji: '🌙',
    desc: 'Только халал, исключает молочные продукты',
    halalOnly: true,
    allergens: ['milk'],
    sugarFree: false,
    priority: 'quality',
  },
  {
    id: 'sugar-free',
    name: 'Диета: без сахара',
    emoji: '🥗',
    desc: 'Исключает продукты с добавленным сахаром',
    halalOnly: false,
    allergens: [],
    sugarFree: true,
    priority: 'quality',
  },
  {
    id: 'economy',
    name: 'Экономия',
    emoji: '💰',
    desc: 'Приоритет — цена, лучшее соотношение',
    halalOnly: false,
    allergens: [],
    sugarFree: false,
    priority: 'price',
  },
]

export const ALLERGEN_OPTIONS = [
  { id: 'milk', label: 'Молоко' },
  { id: 'gluten', label: 'Глютен' },
  { id: 'nuts', label: 'Орехи' },
  { id: 'soy', label: 'Соя' },
  { id: 'eggs', label: 'Яйца' },
]

export const ALLERGEN_NAMES = {
  milk: 'Молоко',
  gluten: 'Глютен',
  nuts: 'Орехи',
  soy: 'Соя',
  eggs: 'Яйца',
  wheat: 'Пшеница',
}

const STORAGE_KEY = 'korset_profile'

export const DEFAULT_PROFILE = {
  presetId: null,
  halalOnly: false,
  allergens: [],
  sugarFree: false,
  priority: 'quality',
}

export function loadProfile() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return { ...DEFAULT_PROFILE, ...JSON.parse(saved) }
  } catch {}
  return { ...DEFAULT_PROFILE }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {}
}

export function applyPreset(presetId) {
  const preset = PRESETS.find((p) => p.id === presetId)
  if (!preset) return DEFAULT_PROFILE
  return {
    presetId: preset.id,
    halalOnly: preset.halalOnly,
    allergens: preset.allergens,
    sugarFree: preset.sugarFree,
    priority: preset.priority,
  }
}
