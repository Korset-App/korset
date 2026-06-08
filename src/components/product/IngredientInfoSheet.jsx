import { useEffect } from 'react'
import './IngredientInfoSheet.css'

export default function IngredientInfoSheet({ item, onClose, onAskAI }) {
  useEffect(() => {
    if (!item) return undefined
    document.body.classList.add('ingredient-sheet-open')
    return () => document.body.classList.remove('ingredient-sheet-open')
  }, [item])

  if (!item) return null

  return (
    <div className="ingredient-sheet" role="presentation" onClick={onClose}>
      <div
        className={`ingredient-sheet__panel ingredient-sheet__panel--${item.tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ingredient-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ingredient-sheet__handle" />
        <div className="ingredient-sheet__topline">
          <span className={`ingredient-sheet__badge ingredient-sheet__badge--${item.tone}`}>
            {item.kindLabel}
          </span>
          <button type="button" className="ingredient-sheet__close" onClick={onClose}>
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <h2 id="ingredient-sheet-title" className="ingredient-sheet__title">
          {item.label}
        </h2>

        <p className="ingredient-sheet__reason">{item.reason}</p>
        <p className="ingredient-sheet__description">{item.description}</p>

        <div className="ingredient-sheet__actions">
          <button type="button" className="ingredient-sheet__ai" onClick={() => onAskAI(item)}>
            <span className="material-symbols-outlined" aria-hidden="true">
              auto_awesome
            </span>
            {item.askAiLabel}
          </button>
          <button type="button" className="ingredient-sheet__secondary" onClick={onClose}>
            {item.closeLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
