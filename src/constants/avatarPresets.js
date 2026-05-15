export const AVATAR_PRESETS = [
  { id: 'av1', src: '/avatars/avatar-samurai.webp' },
  { id: 'av2', src: '/avatars/avatar-samurai-f.webp' },
  { id: 'av4', src: '/avatars/avatar-alchemist.webp' },
  { id: 'av5', src: '/avatars/avatar-alchemist-f.webp' },
  { id: 'av11', src: '/avatars/avatar-northern-explorer.webp' },
  { id: 'av9', src: '/avatars/avatar-explorer-f.webp' },
  { id: 'av12', src: '/avatars/avatar-masked-spirit-male.webp' },
  { id: 'av6', src: '/avatars/avatar-masked-spirit.webp' },
  { id: 'av3', src: '/avatars/avatar-admiral-samurai.webp' },
  { id: 'av10', src: '/avatars/avatar-grove-keeper.webp' },
]

export function getAvatarPresetById(id) {
  return AVATAR_PRESETS.find((item) => item.id === id) || null
}
