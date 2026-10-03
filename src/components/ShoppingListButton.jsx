import { useI18n } from '../i18n/index.js'
import { useUserData } from '../contexts/UserDataContext.jsx'
import { ShoppingListIcon } from './icons/ShoppingListIcon.jsx'
import './ShoppingListButton.css'

export default function ShoppingListButton({ active, onClick, className = '', disabled = false }) {
  const { t } = useI18n()
  const { shoppingListLoadError, shoppingListReady } = useUserData()
  const label = shoppingListLoadError
    ? t('shopping.loadFailed')
    : t(active ? 'shopping.remove' : 'shopping.add')
  return (
    <button
      type="button"
      className={`shopping-list-button${active ? ' is-active' : ''} ${className}`.trim()}
      aria-pressed={Boolean(active)}
      aria-label={label}
      title={label}
      disabled={disabled || !shoppingListReady}
      onClick={onClick}
    >
      <ShoppingListIcon active={Boolean(active)} size={22} />
    </button>
  )
}
