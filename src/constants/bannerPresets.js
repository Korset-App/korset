// Banner presets for ProfileScreen background card.
// Stored as `preset:<id>` in users.banner_url. URLs are public assets in /public/profile-bgs/.

export const BANNER_PRESETS = [
  /* ── Modern luminous mesh gradient banners (Sapphire, Mint, Titanium Gold) ── */
  {
    id: 'neutral-slate',
    src: '/profile-bgs/neutral-slate.webp',
    label: { ru: 'Королевский Сапфир', kz: 'Сапфир көк' },
  },
  {
    id: 'neutral-indigo',
    src: '/profile-bgs/neutral-indigo.webp',
    label: { ru: 'Северная Мята', kz: 'Солтүстік Жалбыз' },
  },
  {
    id: 'neutral-warm',
    src: '/profile-bgs/neutral-warm.webp',
    label: { ru: 'Титан и Золото', kz: 'Титан және Алтын' },
  },

  /* ── Illustrated artistic banners (archive collection) ── */
  {
    id: 'golden-samurai',
    src: '/profile-bgs/golden-samurai.webp',
    label: { ru: 'Золотой закат', kz: 'Алтын күн батуы' },
  },
  {
    id: 'starlit-observatory',
    src: '/profile-bgs/starlit-observatory.webp',
    label: { ru: 'Звёздная ночь', kz: 'Жұлдызды түн' },
  },
  {
    id: 'witching-hour',
    src: '/profile-bgs/witching-hour.webp',
    label: { ru: 'Ведьмин час', kz: 'Сиқыршы сағаты' },
  },
  {
    id: 'teal-moonlight',
    src: '/profile-bgs/teal-moonlight.webp',
    label: { ru: 'Бирюзовая луна', kz: 'Көкжасын ай' },
  },
  {
    id: 'crescent-nightingale',
    src: '/profile-bgs/crescent-nightingale.webp',
    label: { ru: 'Полумесяц', kz: 'Жарты ай' },
  },
  {
    id: 'dawn-ronin',
    src: '/profile-bgs/dawn-ronin.webp',
    label: { ru: 'Рассветный ронин', kz: 'Таңғы ронин' },
  },
  {
    id: 'midnight-grove',
    src: '/profile-bgs/midnight-grove.webp',
    label: { ru: 'Полночная роща', kz: 'Түнгі орман' },
  },
]

export const DEFAULT_BANNER_ID = 'neutral-slate'

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
