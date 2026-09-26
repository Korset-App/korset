import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n/index.js'
import { analyzeProductIngredients } from '../../domain/product/ingredientAnalysis.js'
import { INGREDIENT_DESCRIPTIONS } from '../../constants/ingredientDescriptions.js'
import IngredientInfoSheet from './IngredientInfoSheet.jsx'
import { ChevronDownIcon, FactCheckIcon } from '../icons/index.js'
import './IngredientsPreview.css'

function enrichHighlight(item, t, lang) {
  const custom = INGREDIENT_DESCRIPTIONS[item.label] || INGREDIENT_DESCRIPTIONS[item.matchedText]
  return {
    ...item,
    kindLabel: t(`product.ingredients.kind.${item.kind}`),
    reason: custom
      ? lang === 'kz'
        ? custom.kz
        : custom.ru
      : t(item.reasonKey, { ingredient: item.label }),
    description: custom
      ? lang === 'kz'
        ? custom.kz
        : custom.ru
      : t(item.descriptionKey || `product.ingredients.description.${item.kind}`, {
          ingredient: item.label,
        }),
    askAiLabel: t('product.ingredients.askAiIngredient'),
    searchGoogleLabel: t('product.ingredients.searchGoogle'),
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
        onClick={(e) => {
          e.stopPropagation()
          onSelect(highlight)
        }}
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
  const [expanded, setExpanded] = useState(false)

  const hasBoth = Boolean(product?.ingredients && product?.ingredientsKz)
  const [selectedLang, setSelectedLang] = useState(() =>
    lang === 'kz' && product?.ingredientsKz ? 'kz' : product?.ingredients ? 'ru' : 'kz'
  )
  const currentLang = hasBoth ? selectedLang : product?.ingredients ? 'ru' : 'kz'

  const targetProduct = useMemo(() => {
    if (currentLang === 'kz' && product?.ingredientsKz) {
      return { ...product, ingredients: product.ingredientsKz }
    }
    return product
  }, [product, currentLang])

  const analysis = useMemo(
    () => analyzeProductIngredients({ product: targetProduct, profile, lang: currentLang }),
    [targetProduct, profile, currentLang]
  )
  const highlights = useMemo(
    () => analysis.highlights.map((item) => enrichHighlight(item, t, currentLang)),
    [analysis.highlights, t, currentLang]
  )
  const highlightsById = useMemo(
    () => new Map(highlights.map((item) => [item.id, item])),
    [highlights]
  )
  const counts = analysis.summary.counts
  const isFull = variant === 'full'

  const isClamped = !isFull && !expanded
  const handleExpandClick = () => {
    if (isClamped) setExpanded(true)
  }

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
          {hasBoth && (
            <div
              role="tablist"
              aria-label={t('product.ingredients')}
              style={{
                display: 'inline-flex',
                background: 'var(--glass-muted)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 2,
                gap: 2,
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={selectedLang === 'ru'}
                onClick={() => setSelectedLang('ru')}
                style={{
                  border: 'none',
                  background: selectedLang === 'ru' ? 'var(--primary)' : 'transparent',
                  color: selectedLang === 'ru' ? '#ffffff' : 'var(--text-soft)',
                  fontSize: 10,
                  fontWeight: selectedLang === 'ru' ? 700 : 500,
                  padding: '3px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  lineHeight: 1.2,
                }}
              >
                RU
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={selectedLang === 'kz'}
                onClick={() => setSelectedLang('kz')}
                style={{
                  border: 'none',
                  background: selectedLang === 'kz' ? 'var(--primary)' : 'transparent',
                  color: selectedLang === 'kz' ? '#ffffff' : 'var(--text-soft)',
                  fontSize: 10,
                  fontWeight: selectedLang === 'kz' ? 700 : 500,
                  padding: '3px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  lineHeight: 1.2,
                }}
              >
                KZ
              </button>
            </div>
          )}
        </div>

        <div
          className={`ingredients-preview__text ${isClamped ? 'ingredients-preview__text--clamped' : ''}`}
          role={isClamped ? 'button' : undefined}
          tabIndex={isClamped ? 0 : undefined}
          onClick={isClamped ? handleExpandClick : undefined}
          onKeyDown={
            isClamped
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleExpandClick()
                  }
                }
              : undefined
          }
        >
          <IngredientTokens
            tokens={analysis.tokens}
            highlightsById={highlightsById}
            onSelect={setSelected}
          />
        </div>

        {isClamped && (
          <button
            type="button"
            className="ingredients-preview__expand-btn"
            onClick={handleExpandClick}
          >
            <ChevronDownIcon size={18} />
            {t('product.ingredients.tapToExpand')}
          </button>
        )}

        {!isFull && !isClamped && highlights.length > 0 && (
          <p className="ingredients-preview__hint">{t('product.ingredients.tapHint')}</p>
        )}

        {!isFull && !isClamped && onOpenFull && (
          <button type="button" className="ingredients-preview__breakdown-btn" onClick={onOpenFull}>
            <FactCheckIcon size={18} />
            {t('product.ingredients.openFull')}
          </button>
        )}

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
      </section>

      <IngredientInfoSheet
        item={selected}
        onClose={() => setSelected(null)}
        onAskAI={(item) => {
          setSelected(null)
          onAskAI?.(item)
        }}
        lang={lang}
      />
    </>
  )
}
