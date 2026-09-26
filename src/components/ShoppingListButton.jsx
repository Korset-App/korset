import { useI18n } from '../i18n/index.js'
import { useUserData } from '../contexts/UserDataContext.jsx'
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
      <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path
          className="shopping-list-button__bag"
          d="M5.2 9.5h17.6l-1.25 14.2a2 2 0 0 1-2 1.8H8.45a2 2 0 0 1-2-1.8L5.2 9.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M10 10V7a4 4 0 0 1 8 0v3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="19.9" cy="20.2" r="5.8" className="shopping-list-button__dot" />
        {active ? (
          <path
            d="m17.4 20.1 1.7 1.7 3.3-3.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M19.9 17.8v4.8m-2.4-2.4h4.8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  )
}
