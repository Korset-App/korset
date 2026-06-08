import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n/index.js'
import { analyzeProductIngredients } from '../../domain/product/ingredientAnalysis.js'
import IngredientInfoSheet from './IngredientInfoSheet.jsx'
import './IngredientsPreview.css'

function enrichHighlight(item, t) {
  return {
    ...item,
    kindLabel: t(`product.ingredients.kind.${item.kind}`),
    reason: t(item.reasonKey, { ingredient: item.label }),
    description: t(item.descriptionKey || `product.ingredients.description.${item.kind}`, {
      ingredient: item.label,
    }),
    askAiLabel: t('product.ingredients.askAiIngredient'),
    closeLabel: t('common.close'),
  }
}

function IngredientTokens({ tokens, highlightsById, onSelect }) {
  return tokens.map((token) => {
    if (!token.highlightId) return <span key={token.id}>{token.text}</span>
    const highlight = highlightsById.get(token.highlightId)
    if (!highlight) return <span key={token.id}>{token.text}</span>
    return (
      <button
        type="button"
        key={token.id}
        className={`ingredients-preview__token ingredients-preview__token--${highlight.tone}`}
        onClick={() => onSelect(highlight)}
      >
        {token.text}
      </button>
    )
  })
}

export default function IngredientsPreview({
  product,
  profile,
  variant = 'compact',
  onOpenFull,
  onAskAI,
}) {
  const { t, lang } = useI18n()
  const [selected, setSelected] = useState(null)
  const analysis = useMemo(
    () => analyzeProductIngredients({ product, profile, lang }),
    [product, profile, lang]
  )
  const highlights = useMemo(
    () => analysis.highlights.map((item) => enrichHighlight(item, t)),
    [analysis.highlights, t]
  )
  const highlightsById = useMemo(
    () => new Map(highlights.map((item) => [item.id, item])),
    [highlights]
  )
  const counts = analysis.summary.counts
  const isFull = variant === 'full'

  if (!analysis.text) return null

  return (
    <>
      <section className={`ingredients-preview ingredients-preview--${variant}`}>
        <div className="ingredients-preview__head">
          <div>
            <h2 className="ingredients-preview__title">{t('product.ingredients')}</h2>
            <p className="ingredients-preview__meta">
              {t('product.ingredients.meta', {
                count: counts.totalIngredients,
                important: counts.highlighted,
              })}
            </p>
          </div>
          {!isFull && (
            <button type="button" className="ingredients-preview__open" onClick={onOpenFull}>
              {t('product.ingredients.openFull')}
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </button>
          )}
        </div>

        <div
          className={`ingredients-preview__text ${isFull ? '' : 'ingredients-preview__text--clamped'}`}
        >
          <IngredientTokens
            tokens={analysis.tokens}
            highlightsById={highlightsById}
            onSelect={setSelected}
          />
        </div>

        {isFull && highlights.length > 0 && (
          <div
            className="ingredients-preview__cards"
            aria-label={t('product.ingredients.explainedForYou')}
          >
            {highlights.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`ingredients-preview__card ingredients-preview__card--${item.tone}`}
                onClick={() => setSelected(item)}
              >
                <span className="ingredients-preview__card-kind">{item.kindLabel}</span>
                <span className="ingredients-preview__card-title">{item.label}</span>
                <span className="ingredients-preview__card-reason">{item.reason}</span>
              </button>
            ))}
          </div>
        )}

        {!isFull && highlights.length > 0 && (
          <p className="ingredients-preview__hint">{t('product.ingredients.tapHint')}</p>
        )}
      </section>

      <IngredientInfoSheet
        item={selected}
        onClose={() => setSelected(null)}
        onAskAI={(item) => {
          setSelected(null)
          onAskAI?.(item)
        }}
      />
    </>
  )
}
