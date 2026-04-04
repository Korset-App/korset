import { getAvatarPresetById } from '../data/avatarPresets.js'

function PresetArtwork({ preset }) {
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: preset.background,
      overflow: 'hidden',
      borderRadius: 'inherit',
    }}>
      <div style={{
        position: 'absolute', inset: 6,
        borderRadius: 'inherit',
        border: '1px solid rgba(255,255,255,0.08)',
      }} />
      <div style={{
        position: 'absolute', top: '11%', right: '12%',
        width: '18%', aspectRatio: '1 / 1',
        borderRadius: '50%',
        background: preset.accent,
        opacity: 0.95,
        filter: 'blur(0.2px)',
        boxShadow: `0 0 22px ${preset.shadow}`,
      }} />
      <div style={{
        position: 'absolute', top: '22%', left: '50%',
        width: '38%', aspectRatio: '1 / 1',
        transform: 'translateX(-50%)',
        borderRadius: '50%',
        background: preset.skin,
        boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.06)',
      }} />
      <div style={{
        position: 'absolute', top: '18%', left: '50%',
        width: '44%', height: '16%',
        transform: 'translateX(-50%)',
        borderRadius: '999px 999px 55% 55%',
        background: 'rgba(15,23,42,0.18)',
      }} />
      <div style={{
        position: 'absolute', left: '14%', right: '14%', bottom: '10%',
        height: '40%',
        borderRadius: '38% 38% 24% 24%',
        background: preset.body,
        boxShadow: 'inset 0 -12px 18px rgba(0,0,0,0.08)',
      }} />
      <div style={{
        position: 'absolute', left: '28%', right: '28%', bottom: '41%',
        height: '12%',
        borderRadius: '0 0 18px 18px',
        background: preset.skin,
      }} />
    </div>
  )
}

export default function ProfileAvatar({ avatarId, name = '', rounded = 'circle' }) {
  const radius = rounded === 'circle' ? '50%' : 22
  const preset = avatarId ? getAvatarPresetById(avatarId) : null

  if (avatarId && /^https?:/i.test(avatarId)) {
    return <img src={avatarId} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: radius, display: 'block' }} />
  }

  if (preset) {
    return <div style={{ width: '100%', height: '100%', borderRadius: radius }}><PresetArtwork preset={preset} /></div>
  }

  const initial = (name?.trim()?.charAt(0) || 'K').toUpperCase()
  return (
    <div style={{
      width: '100%', height: '100%', borderRadius: radius,
      background: 'linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: '38%', letterSpacing: '0.04em',
    }}>
      {initial}
    </div>
  )
}
