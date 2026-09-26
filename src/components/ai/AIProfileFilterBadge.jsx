import { VerifiedBadgeIcon } from '../icons/index.js'

/**
 * Discreet profile filter toggle badge for Körset AI.
 * Shows active profile preferences (Halal, Allergens) with one-tap toggle.
 */
export function AIProfileFilterBadge({
  profile,
  enabled = true,
  onToggle,
  lang = 'ru',
}) {
  if (!profile) return null

  const items = []
  if (profile.halal) items.push(lang === 'kz' ? 'Халал' : 'Халал')
  if (profile.allergens?.length) {
    const count = profile.allergens.length
    items.push(lang === 'kz' ? `${count} аллерген` : `${count} аллерг.`)
  }
  if (profile.dietGoals?.length) {
    items.push(lang === 'kz' ? 'Диета' : 'Диета')
  }

  if (items.length === 0) return null

  const label = items.join(' · ')

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`ai-profile-badge${enabled ? ' is-active' : ' is-disabled'}`}
      title={
        enabled
          ? lang === 'kz'
            ? 'Профиль сүзгілері қосулы (өшіру үшін басыңыз)'
            : 'Фильтры профиля включены (нажмите для отключения)'
          : lang === 'kz'
            ? 'Профиль сүзгілері өшірулі (қосу үшін басыңыз)'
            : 'Фильтры профиля выключены (нажмите для включения)'
      }
      aria-label={label}
    >
      <span className="ai-profile-badge__icon">
        <VerifiedBadgeIcon size={13} />
      </span>
      <span className="ai-profile-badge__text">
        {lang === 'kz' ? 'Профиль: ' : 'Профиль: '}
        <strong>{label}</strong>
      </span>
      <span className="ai-profile-badge__status">
        {enabled ? (lang === 'kz' ? 'Қосулы' : 'Вкл') : lang === 'kz' ? 'Өшірулі' : 'Выкл'}
      </span>
    </button>
  )
}
