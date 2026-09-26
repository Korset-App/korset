import { useState } from 'react'
import { CartIcon, CheckCircleIcon, ShareIcon } from '../icons/index.js'

function formatPrice(val) {
  const num = Number(val)
  return Number.isFinite(num) && num > 0 ? `${new Intl.NumberFormat('ru-KZ').format(num)} ₸` : '0 ₸'
}

export function AIRecipeSummaryBar({
  selectedProducts = [],
  totalRolesCount = 0,
  budget = null,
  recipeTitle = '',
  lang = 'ru',
}) {
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const totalPrice = selectedProducts.reduce((sum, p) => sum + (Number(p?.priceKzt) || 0), 0)
  const selectedCount = selectedProducts.filter(Boolean).length

  const isUnderBudget = budget && budget > 0 ? totalPrice <= budget : true
  const budgetDiff = budget && budget > 0 ? budget - totalPrice : null

  const handleSaveToShoppingList = () => {
    try {
      const storageKey = 'korset_shopping_list'
      const raw = localStorage.getItem(storageKey)
      const existing = raw ? JSON.parse(raw) : []
      const newItems = selectedProducts.filter(Boolean).map((p) => ({
        ean: p.ean,
        name: p.name,
        priceKzt: p.priceKzt,
        image: p.image,
        brand: p.brand,
        addedAt: Date.now(),
        recipe: recipeTitle,
      }))
      const combined = [...existing.filter((e) => !newItems.some((n) => n.ean === e.ean)), ...newItems]
      localStorage.setItem(storageKey, JSON.stringify(combined))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (_e) {
      // ignore storage error
    }
  }

  const handleCopyList = () => {
    const lines = [
      `🛒 ${recipeTitle || (lang === 'kz' ? 'Сатып алу тізімі' : 'Список покупок')} (Körset):`,
      ...selectedProducts.filter(Boolean).map((p, idx) => `${idx + 1}. ${p.name} — ${formatPrice(p.priceKzt)}`),
      `Итого: ${formatPrice(totalPrice)}`,
    ]
    const text = lines.join('\n')
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      })
    }
  }

  return (
    <div className="ai-recipe-summary">
      <div className="ai-recipe-summary__main">
        <div className="ai-recipe-summary__count">
          {lang === 'kz'
            ? `Таңдалды: ${selectedCount} / ${totalRolesCount} ингредиент`
            : `Выбрано: ${selectedCount} из ${totalRolesCount} ингредиентов`}
        </div>
        <div className="ai-recipe-summary__price-wrap">
          <span className="ai-recipe-summary__price-label">
            {lang === 'kz' ? 'Жалпы сома:' : 'Итого за корзину:'}
          </span>
          <span className="ai-recipe-summary__total-price">{formatPrice(totalPrice)}</span>
        </div>

        {budget && budget > 0 && (
          <div className={`ai-recipe-summary__budget-badge${isUnderBudget ? ' is-ok' : ' is-over'}`}>
            {isUnderBudget
              ? lang === 'kz'
                ? `✓ Бюджетке сай (${formatPrice(budget)} шегінде)`
                : `✓ В рамках бюджета (до ${formatPrice(budget)})`
              : lang === 'kz'
                ? `Лимиттен асу: +${formatPrice(Math.abs(budgetDiff))}`
                : `Превышение бюджета: +${formatPrice(Math.abs(budgetDiff))}`}
          </div>
        )}
      </div>

      <div className="ai-recipe-summary__actions">
        <button
          type="button"
          className={`ai-recipe-summary__save-btn${saved ? ' is-saved' : ''}`}
          onClick={handleSaveToShoppingList}
        >
          {saved ? (
            <>
              <CheckCircleIcon size={16} />
              <span>{lang === 'kz' ? 'Тізімге қосылды!' : 'Добавлено в список!'}</span>
            </>
          ) : (
            <>
              <CartIcon size={16} />
              <span>{lang === 'kz' ? 'Тізімге сақтау' : 'Сохранить в список'}</span>
            </>
          )}
        </button>

        <button
          type="button"
          className="ai-recipe-summary__copy-btn"
          onClick={handleCopyList}
          title={lang === 'kz' ? 'Тізімді көшіру' : 'Скопировать список'}
          aria-label={lang === 'kz' ? 'Тізімді көшіру' : 'Скопировать список'}
        >
          {copied ? <CheckCircleIcon size={16} /> : <ShareIcon size={16} />}
        </button>
      </div>
    </div>
  )
}
