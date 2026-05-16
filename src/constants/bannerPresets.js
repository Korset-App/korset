// Banner presets for ProfileScreen background card.
// Stored as `preset:<id>` in users.banner_url. URLs are public assets in /public/profile-bgs/.

export const BANNER_PRESETS = [
  /* ── Photo banners (WebP, 1200×450, optimized via optimize:banners) ── */
  {
    id: 'golden-samurai',
    src: '/profile-bgs/golden-samurai.webp',
    thumb: '/profile-bgs/thumbs/golden-samurai.webp',
    label: { ru: 'Золотой закат', kz: 'Алтын күн батуы' },
  },
  {
    id: 'starlit-observatory',
    src: '/profile-bgs/starlit-observatory.webp',
    thumb: '/profile-bgs/thumbs/starlit-observatory.webp',
    label: { ru: 'Звёздная ночь', kz: 'Жұлдызды түн' },
  },
  {
    id: 'witching-hour',
    src: '/profile-bgs/witching-hour.webp',
    thumb: '/profile-bgs/thumbs/witching-hour.webp',
    label: { ru: 'Ведьмин час', kz: 'Сиқыршы сағаты' },
  },
  {
    id: 'teal-moonlight',
    src: '/profile-bgs/teal-moonlight.webp',
    thumb: '/profile-bgs/thumbs/teal-moonlight.webp',
    label: { ru: 'Бирюзовая луна', kz: 'Көкжасын ай' },
  },
  {
    id: 'crescent-nightingale',
    src: '/profile-bgs/crescent-nightingale.webp',
    thumb: '/profile-bgs/thumbs/crescent-nightingale.webp',
    label: { ru: 'Полумесяц', kz: 'Жарты ай' },
  },
  {
    id: 'dawn-ronin',
    src: '/profile-bgs/dawn-ronin.webp',
    thumb: '/profile-bgs/thumbs/dawn-ronin.webp',
    label: { ru: 'Рассветный ронин', kz: 'Таңғы ронин' },
  },
  {
    id: 'midnight-grove',
    src: '/profile-bgs/midnight-grove.webp',
    thumb: '/profile-bgs/thumbs/midnight-grove.webp',
    label: { ru: 'Полночная роща', kz: 'Түнгі орман' },
  },
]

export const DEFAULT_BANNER_ID = 'golden-samurai'

/**
 * Resolve a stored banner value (preset id or full URL) to an image src.
 * @param {string|null|undefined} value - either `preset:<id>`, plain `<id>`, full URL, or null.
 * @returns {string} resolved image URL (falls back to default preset).
 */
export function resolveBannerSrc(value) {
  if (!value) return getPresetSrc(DEFAULT_BANNER_ID)
  if (/^https?:\/\//i.test(value)) return value
  const id = value.startsWith('preset:') ? value.slice(7) : value
  return getPresetSrc(id)
}

function getPresetSrc(id) {
  const found = BANNER_PRESETS.find((p) => p.id === id)
  return found ? found.src : BANNER_PRESETS[0].src
}
