export const AVATAR_PRESETS = [
  { id: 'av1', src: '/avatars/avatar-samurai.webp' },
  { id: 'av2', src: '/avatars/avatar-samurai-f.webp' },
  { id: 'av4', src: '/avatars/avatar-alchemist.webp' },
  { id: 'av5', src: '/avatars/avatar-alchemist-f.webp' },
  { id: 'av12', src: '/avatars/avatar-masked-spirit-male.webp' },
  { id: 'av6', src: '/avatars/avatar-masked-spirit.webp' },
  { id: 'av11', src: '/avatars/avatar-northern-explorer.webp' },
  { id: 'av9', src: '/avatars/avatar-explorer-f.webp' },
  { id: 'av3', src: '/avatars/avatar-admiral-samurai.webp' },
  { id: 'av10', src: '/avatars/avatar-grove-keeper.webp' },
]

export const SILHOUETTE_PRESETS = [
  { id: 'av20', color: 'blue', label: { ru: 'Сапфир', kz: 'Сапфир' } },
  { id: 'av21', color: 'emerald', label: { ru: 'Изумруд', kz: 'Зүбаржат' } },
  { id: 'av22', color: 'indigo', label: { ru: 'Индиго', kz: 'Индиго' } },
  { id: 'av23', color: 'slate', label: { ru: 'Титан', kz: 'Титан' } },
  { id: 'av24', color: 'cyan', label: { ru: 'Бирюза', kz: 'Көгілдір' } },
]

export const DEFAULT_AVATAR_ID = 'av20'

export function getAvatarPresetById(id) {
  if (!id) return null
  const sil = SILHOUETTE_PRESETS.find((item) => item.id === id)
  if (sil) return sil
  return AVATAR_PRESETS.find((item) => item.id === id) || null
}
