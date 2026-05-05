const IMAGE_BASE = '/catalog-categories'

export const CATEGORY_SHOWCASE_ORDER = [
  'dairy_eggs',
  'water_beverages',
  'sweets',
  'meat',
  'tea_coffee',
  'fish',
  'deli',
  'grocery',
  'snacks',
  'bread',
  'fruits_veg',
  'ready_meals',
  'frozen',
  'baby_food',
  'sauces_spices',
  'healthy',
  'personal_care',
  'household',
]

export const CATEGORY_SHOWCASE = {
  dairy_eggs: {
    image: `${IMAGE_BASE}/category-dairy-eggs.webp`,
    variant: 'wide',
    tone: 'berry',
    textTone: 'dark',
  },
  meat: {
    image: `${IMAGE_BASE}/category-meat.webp`,
    variant: 'compact',
    tone: 'green',
    textTone: 'dark',
  },
  deli: {
    image: `${IMAGE_BASE}/category-deli.webp`,
    variant: 'compact',
    tone: 'citrus',
    textTone: 'dark',
  },
  fish: {
    image: `${IMAGE_BASE}/category-fish.webp`,
    variant: 'wide',
    tone: 'aqua',
    textTone: 'dark',
  },
  water_beverages: {
    image: `${IMAGE_BASE}/category-water-beverages.webp`,
    variant: 'portrait',
    tone: 'paper',
    textTone: 'dark',
    imageY: '48%',
  },
  tea_coffee: {
    image: `${IMAGE_BASE}/category-tea-coffee.webp`,
    variant: 'portrait',
    tone: 'plum',
    textTone: 'light',
    imageScale: 1.18,
  },
  sweets: {
    image: `${IMAGE_BASE}/category-sweets.webp`,
    variant: 'hero',
    tone: 'mint',
    textTone: 'light',
  },
  snacks: {
    image: `${IMAGE_BASE}/category-snacks.webp`,
    variant: 'hero',
    tone: 'coral',
    textTone: 'dark',
  },
  grocery: {
    image: `${IMAGE_BASE}/category-grocery.webp`,
    variant: 'portrait',
    tone: 'teal',
    textTone: 'light',
    imageScale: 1.14,
  },
  sauces_spices: {
    image: `${IMAGE_BASE}/category-sauces-spices.webp`,
    variant: 'wide',
    tone: 'tomato',
    textTone: 'light',
  },
  bread: {
    image: `${IMAGE_BASE}/category-bread.webp`,
    variant: 'wide',
    tone: 'wheat',
    textTone: 'dark',
    imageY: '48%',
  },
  frozen: {
    image: `${IMAGE_BASE}/category-frozen.webp`,
    variant: 'wide',
    tone: 'ice',
    textTone: 'dark',
    imageY: '49%',
  },
  fruits_veg: {
    image: `${IMAGE_BASE}/category-fruits-veg.webp`,
    variant: 'wide',
    tone: 'lime',
    textTone: 'dark',
  },
  baby_food: {
    image: `${IMAGE_BASE}/category-baby-food.webp`,
    variant: 'square',
    tone: 'cream',
    textTone: 'dark',
  },
  ready_meals: {
    image: `${IMAGE_BASE}/category-ready-meals.webp`,
    variant: 'portrait',
    tone: 'blue',
    textTone: 'light',
  },
  healthy: {
    image: `${IMAGE_BASE}/category-healthy.webp`,
    variant: 'compact',
    tone: 'leaf',
    textTone: 'light',
  },
  personal_care: {
    image: `${IMAGE_BASE}/category-personal-care.webp`,
    variant: 'portrait',
    tone: 'clean',
    textTone: 'dark',
  },
  household: {
    image: `${IMAGE_BASE}/category-household.webp`,
    variant: 'hero',
    tone: 'violet',
    textTone: 'light',
    imageScale: 0.92,
  },
}

const FALLBACK_SHOWCASE = {
  image: `${IMAGE_BASE}/category-grocery.webp`,
  variant: 'square',
  tone: 'teal',
  textTone: 'light',
}

export function getCategoryShowcase(categoryKey) {
  return CATEGORY_SHOWCASE[categoryKey] || FALLBACK_SHOWCASE
}
