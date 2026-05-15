import { getAvatarPresetById } from '../constants/avatarPresets.js'

export default function ProfileAvatar({ avatarId, name = '', rounded = 'circle' }) {
  const radius = rounded === 'circle' ? '50%' : 22

  if (avatarId && /^https?:/i.test(avatarId)) {
    return (
      <img
        src={avatarId}
        alt="Avatar"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: radius,
          display: 'block',
        }}
      />
    )
  }

  const preset = avatarId ? getAvatarPresetById(avatarId) : null

  if (preset?.src) {
    return (
      <img
        src={preset.src}
        alt="Avatar"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: radius,
          display: 'block',
        }}
      />
    )
  }

  const initial = (name?.trim()?.charAt(0) || 'K').toUpperCase()
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: radius,
        background: 'linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 800,
        fontSize: '38%',
        letterSpacing: '0.04em',
      }}
    >
      {initial}
    </div>
  )
}
