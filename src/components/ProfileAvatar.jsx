import { getAvatarPresetById } from '../constants/avatarPresets.js'

const INITIAL_PALETTES = [
  // 1. Royal Indigo / Violet
  {
    bg: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    border: 'rgba(255, 255, 255, 0.22)',
    glow: 'rgba(99, 102, 241, 0.35)',
  },
  // 2. Electric Cyan / Ocean
  {
    bg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    border: 'rgba(255, 255, 255, 0.22)',
    glow: 'rgba(2, 132, 199, 0.35)',
  },
  // 3. Emerald Mint
  {
    bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    border: 'rgba(255, 255, 255, 0.22)',
    glow: 'rgba(5, 150, 105, 0.35)',
  },
  // 4. Cobalt Sapphire
  {
    bg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    border: 'rgba(255, 255, 255, 0.22)',
    glow: 'rgba(37, 99, 235, 0.35)',
  },
  // 5. Sleek Titanium / Slate
  {
    bg: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
    border: 'rgba(255, 255, 255, 0.22)',
    glow: 'rgba(71, 85, 105, 0.35)',
  },
]

const SILHOUETTE_STYLES = {
  av20: {
    bg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    border: 'rgba(255, 255, 255, 0.22)',
    glow: 'rgba(37, 99, 235, 0.35)',
  },
  av21: {
    bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    border: 'rgba(255, 255, 255, 0.22)',
    glow: 'rgba(5, 150, 105, 0.35)',
  },
  av22: {
    bg: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    border: 'rgba(255, 255, 255, 0.22)',
    glow: 'rgba(99, 102, 241, 0.35)',
  },
  av23: {
    bg: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
    border: 'rgba(255, 255, 255, 0.22)',
    glow: 'rgba(71, 85, 105, 0.35)',
  },
  av24: {
    bg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    border: 'rgba(255, 255, 255, 0.22)',
    glow: 'rgba(2, 132, 199, 0.35)',
  },
}

export default function ProfileAvatar({ avatarId, name = '', rounded = 'circle' }) {
  const radius = rounded === 'circle' ? '50%' : 18

  // 1. Custom uploaded image URL
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
          overflow: 'hidden',
        }}
      />
    )
  }

  // 2. Color human silhouette avatar (av20..av24)
  if (avatarId && SILHOUETTE_STYLES[avatarId]) {
    const sil = SILHOUETTE_STYLES[avatarId]
    return (
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: radius,
          background: sil.bg,
          border: `1.5px solid ${sil.border}`,
          boxShadow: `inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 2px 8px ${sil.glow}`,
          boxSizing: 'border-box',
          display: 'block',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <g fill="#ffffff" opacity="0.94">
          <circle cx="50" cy="35" r="16" />
          <path d="M50 56c-17 0-30 11-30 25 0 2 1.5 3 3.5 3h53c2 0 3.5-1 3.5-3 0-14-13-25-30-25z" />
        </g>
      </svg>
    )
  }

  // 3. Preset image avatar (samurai, alchemist, etc.)
  if (avatarId && avatarId !== 'initial') {
    const preset = getAvatarPresetById(avatarId)
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
            overflow: 'hidden',
          }}
        />
      )
    }
  }

  const trimmedName = typeof name === 'string' ? name.trim() : ''

  // 3. Unauthenticated / Guest state: clean user profile silhouette icon
  if ((!avatarId || avatarId === 'guest') && !trimmedName) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: radius,
          background: 'var(--glass-bg)',
          border: '1.5px solid var(--glass-border)',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-dim)',
          overflow: 'hidden',
        }}
        aria-label="Гость"
      >
        <svg
          width="50%"
          height="50%"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
    )
  }

  // 4. Initial / Letter avatar (for logged-in user or when initial preset is chosen)
  const initial = (trimmedName.charAt(0) || 'K').toUpperCase()
  const code = initial.charCodeAt(0) || 0
  const palette = INITIAL_PALETTES[code % INITIAL_PALETTES.length]

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: radius,
        background: palette.bg,
        border: `1.5px solid ${palette.border}`,
        boxShadow: `inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 2px 8px ${palette.glow}`,
        boxSizing: 'border-box',
        display: 'block',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <text
        x="50%"
        y="52%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontFamily="var(--font-display)"
        fontWeight="750"
        fontSize="52"
        letterSpacing="-0.02em"
      >
        {initial}
      </text>
    </svg>
  )
}
