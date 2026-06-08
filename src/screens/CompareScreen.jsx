import { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { checkProductFit } from '../utils/fitCheck.js'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { useI18n } from '../i18n/index.js'
import { useLocalName } from '../utils/localName.js'
import { getAnyKnownProductByRef } from '../utils/storeCatalog.js'
import { buildProductAIPath, buildProductAlternativesPath } from '../utils/routes.js'
import { buildProductComparison } from '../domain/product/comparison.js'
import { buildProductComparisonViewModel } from '../domain/product/comparisonViewModel.js'
import { getFitBadgeMeta, resolveFitSeverityKey } from '../domain/product/fitVerdict.js'
import './CompareScreen.css'

function getComparisonBarSplit(comparisonView) {
  if (!comparisonView || comparisonView.status !== 'winner') return 50
  if (comparisonView.winnerSide === 'A') return comparisonView.confidence === 'clear' ? 66 : 58
  return comparisonView.confidence === 'clear' ? 34 : 42
}

function getComparisonIcon(comparisonView) {
  if (comparisonView?.status === 'blocked') return 'block'
  if (comparisonView?.status === 'draw') return 'balance'
  if (comparisonView?.confidence === 'preliminary') return 'rule'
  return 'workspace_premium'
}

function getSideLabelKey(label) {
  if (label === 'best_choice') return 'compare.label.best'
  if (label === 'fits_but_check') return 'compare.label.check'
  if (label === 'choose_another') return 'compare.label.avoid'
  return 'compare.label.good'
}

function getProductImage(product) {
  return (
    product?.images?.[0] ||
    product?.image ||
    product?.imageUrl ||
    (product?.ean ? `/products/${product.ean}.png` : null)
  )
}

function ProductPhoto({ product }) {
  const [ok, setOk] = useState(true)
  const src = getProductImage(product)

  if (!src || !ok) {
    return (
      <div className="compare-photo-fallback" aria-hidden="true">
        {product?.name?.[0] || '?'}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={product?.name || ''}
      width="96"
      height="96"
      onError={() => setOk(false)}
      className="compare-photo-img product-img-blend"
    />
  )
}

function ProductPanel({ product, productName, fit, side, sideLabel, t }) {
  const severityKey = resolveFitSeverityKey(fit)
  const badge = getFitBadgeMeta(severityKey)

  return (
    <section
      className={`compare-product compare-product--${side.toLowerCase()}`}
      aria-label={productName}
    >
      <div className="compare-product-photo catalog-img-box">
        <ProductPhoto product={product} />
      </div>
      <div className="compare-product-side">{sideLabel}</div>
      <h2 className="compare-product-name">{productName}</h2>
      <div className={`compare-fit-badge compare-fit-badge--${badge.key}`}>
        <span className="material-symbols-outlined" aria-hidden="true">
          {badge.icon}
        </span>
        {t(badge.labelKey)}
      </div>
    </section>
  )
}

function FactorCard({ factor, localNameA, localNameB, t }) {
  const winnerName =
    factor.winnerSide === 'A' ? localNameA : factor.winnerSide === 'B' ? localNameB : null

  return (
    <article
      className={`compare-factor ${factor.winnerSide ? 'compare-factor--decisive' : 'compare-factor--neutral'}`}
    >
      <div className="compare-factor-head">
        <span className="compare-factor-label">{t(factor.labelKey)}</span>
        {winnerName && <span className="compare-factor-side">{winnerName}</span>}
      </div>
      {factor.reasonKey && (
        <p className="compare-factor-copy">{t(factor.reasonKey, { name: winnerName || '' })}</p>
      )}
    </article>
  )
}

function CompareNote({ tone = 'neutral', icon, children }) {
  return (
    <div className={`compare-note compare-note--${tone}`}>
      <span className="material-symbols-outlined" aria-hidden="true">
        {icon}
      </span>
      <p>{children}</p>
    </div>
  )
}

export default function CompareScreen() {
  const { ean, ean2, storeSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useProfile()
  const { currentStore } = useStore()
  const { t, lang } = useI18n()

  const [aiText, setAiText] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  const activeSlug = storeSlug || currentStore?.slug || null

  const productA = useMemo(() => {
    const stateA = location.state?.productA
    if (stateA?.ean === ean) return stateA
    return getAnyKnownProductByRef(ean, activeSlug) || stateA || null
  }, [ean, activeSlug, location.state])

  const productB = useMemo(() => {
    const stateB = location.state?.productB
    if (stateB?.ean === ean2) return stateB
    return getAnyKnownProductByRef(ean2, activeSlug) || stateB || null
  }, [ean2, activeSlug, location.state])

  const localNameA = useLocalName(productA)
  const localNameB = useLocalName(productB)

  const fitA = useMemo(
    () => (productA ? checkProductFit(productA, profile) : null),
    [productA, profile]
  )
  const fitB = useMemo(
    () => (productB ? checkProductFit(productB, profile) : null),
    [productB, profile]
  )

  const comparison = useMemo(() => {
    if (!productA || !productB) return null
    return buildProductComparison(productA, productB, { profile })
  }, [productA, productB, profile])

  const comparisonView = useMemo(() => {
    if (!productA || !productB || !comparison) return null
    return buildProductComparisonViewModel({ productA, productB, comparison, profile })
  }, [productA, productB, comparison, profile])

  const winner = comparisonView?.winnerSide || 'draw'
  const barSplit = getComparisonBarSplit(comparisonView)

  useEffect(() => {
    if (!productA || !productB || !comparisonView) return undefined

    let mounted = true
    const ctrl = new AbortController()

    async function loadAiExplanation() {
      await Promise.resolve()
      if (!mounted) return
      setAiText(null)
      setAiLoading(true)

      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'compare',
            productA,
            productB,
            profile,
            winner,
            lang: lang === 'kz' ? 'kz' : 'ru',
            messages: [{ role: 'user', content: t('compare.aiExplainPrompt') }],
          }),
          signal: ctrl.signal,
        })
        if (!response.ok) throw new Error('API error')
        const data = await response.json()
        if (mounted) setAiText(data.reply || '')
      } catch (error) {
        if (mounted && error.name !== 'AbortError') setAiText(t('compare.aiError') || '')
      } finally {
        if (mounted) setAiLoading(false)
      }
    }

    loadAiExplanation()

    return () => {
      mounted = false
      ctrl.abort()
    }
  }, [productA, productB, profile, winner, lang, t, comparisonView])

  if (!productA || !productB || !comparisonView) {
    return (
      <main className="compare-empty screen">
        <div className="compare-empty-card">
          <span className="material-symbols-outlined" aria-hidden="true">
            compare_arrows
          </span>
          <p>{t('common.notFound')}</p>
          <button className="btn btn-secondary" type="button" onClick={() => navigate(-1)}>
            {t('common.back')}
          </button>
        </div>
      </main>
    )
  }

  const winnerProduct = winner === 'A' ? productA : winner === 'B' ? productB : null
  const winnerName = winner === 'A' ? localNameA : winner === 'B' ? localNameB : ''
  const profilePreferenceName =
    comparisonView.profileNote?.winnerSide === 'A'
      ? localNameA
      : comparisonView.profileNote?.winnerSide === 'B'
        ? localNameB
        : ''
  const isBlocked = comparisonView.status === 'blocked'
  const isDraw = comparisonView.status === 'draw'
  const actionProduct = winnerProduct || productA
  const actionLabel = isBlocked ? t(comparisonView.actionKey) : t('compare.askMore')

  function handlePrimaryAction() {
    if (isBlocked) {
      navigate(buildProductAlternativesPath(activeSlug, productA.ean))
      return
    }
    navigate(buildProductAIPath(activeSlug, actionProduct.ean))
  }

  return (
    <main
      className={`compare-screen compare-screen--${comparisonView?.status || 'loading'} compare-screen--${comparisonView?.confidence || 'unknown'}`}
    >
      <header className="compare-header">
        <nav className="compare-nav" aria-label={t('compare.title')}>
          <button
            className="compare-back"
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t('common.back')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_back
            </span>
          </button>
          <div className="compare-title" translate="no">
            <span className="material-symbols-outlined" aria-hidden="true">
              compare_arrows
            </span>
            {t('compare.title')}
          </div>
          <div className="compare-nav-spacer" aria-hidden="true" />
        </nav>

        <div className="compare-products" aria-label={t('compare.title')}>
          <ProductPanel
            product={productA}
            productName={localNameA}
            fit={fitA}
            side="A"
            sideLabel="A"
            t={t}
          />
          <ProductPanel
            product={productB}
            productName={localNameB}
            fit={fitB}
            side="B"
            sideLabel="B"
            t={t}
          />
        </div>
      </header>

      <section className="compare-body" aria-live="polite">
        <section className="compare-verdict-card" aria-labelledby="compare-verdict-title">
          <div className="compare-verdict-topline">
            <span>{t(`compare.confidence.${comparisonView.confidence}`)}</span>
            <span>{t(comparisonView.sections[0]?.titleKey || 'compare.section.decision')}</span>
          </div>

          {comparisonView.status === 'winner' ? (
            <div className="compare-rail" aria-hidden="true">
              <span>{localNameA}</span>
              <div className="compare-rail-track">
                <div className="compare-rail-fill" style={{ '--compare-split': `${barSplit}%` }} />
              </div>
              <span>{localNameB}</span>
            </div>
          ) : (
            <div className="compare-state-strip" aria-hidden="true">
              <span className="material-symbols-outlined">{getComparisonIcon(comparisonView)}</span>
            </div>
          )}

          <div className="compare-verdict-main">
            <div className="compare-verdict-icon">
              <span className="material-symbols-outlined" aria-hidden="true">
                {getComparisonIcon(comparisonView)}
              </span>
            </div>
            <div className="compare-verdict-copy">
              <h1 id="compare-verdict-title">
                {t(comparisonView.verdictKey)}
                {winnerName ? `: ${winnerName}` : ''}
              </h1>
              <p>
                {comparisonView.reasonKey
                  ? t(comparisonView.reasonKey, { name: winnerName })
                  : t('compare.reason.similar_fit', { name: winnerName })}
              </p>
            </div>
          </div>

          <div className="compare-side-labels" aria-label={t('compare.section.profile')}>
            <span className={winner === 'A' ? 'is-active' : ''}>
              {t(getSideLabelKey(comparison.a.label))}
            </span>
            <span className={winner === 'B' ? 'is-active' : ''}>
              {t(getSideLabelKey(comparison.b.label))}
            </span>
          </div>
        </section>

        {(comparisonView.profileNote || comparisonView.dataNote || isBlocked || isDraw) && (
          <section className="compare-notes" aria-label={t('compare.section.data')}>
            {isBlocked && (
              <CompareNote tone="blocked" icon="category">
                {t('compare.reason.different_category')}
              </CompareNote>
            )}
            {isDraw && (
              <CompareNote tone="neutral" icon="balance">
                {t('compare.reason.similar_fit', { name: winnerName })}
              </CompareNote>
            )}
            {comparisonView.profileNote && (
              <CompareNote tone="profile" icon="person_check">
                {t(comparisonView.profileNote.messageKey)}
                {profilePreferenceName ? ` ${profilePreferenceName}.` : ''}
              </CompareNote>
            )}
            {comparisonView.dataNote && (
              <CompareNote tone="data" icon="fact_check">
                {t(comparisonView.dataNote.messageKey)}
              </CompareNote>
            )}
          </section>
        )}

        {comparisonView.topFactors.length > 0 && (
          <section className="compare-factors" aria-labelledby="compare-factors-title">
            <div className="compare-section-heading">
              <span>{t('compare.section.decision')}</span>
              <span>{comparisonView.topFactors.length}</span>
            </div>
            <h2 id="compare-factors-title">{t('compare.section.decision')}</h2>
            <div className="compare-factor-list">
              {comparisonView.topFactors.map((factor) => (
                <FactorCard
                  key={factor.id}
                  factor={factor}
                  localNameA={localNameA}
                  localNameB={localNameB}
                  t={t}
                />
              ))}
            </div>
          </section>
        )}

        {(aiLoading || aiText) && (
          <section className="compare-ai-card" aria-live="polite" aria-label={t('compare.askMore')}>
            {aiLoading && !aiText ? (
              <div className="compare-ai-loading">
                <span className="compare-spinner" aria-hidden="true" />
                <span>{t('compare.aiLoading')}</span>
              </div>
            ) : (
              <p>{aiText}</p>
            )}
          </section>
        )}

        <button className="compare-primary-action" type="button" onClick={handlePrimaryAction}>
          <span className="material-symbols-outlined" aria-hidden="true">
            {isBlocked ? 'travel_explore' : 'auto_awesome'}
          </span>
          {actionLabel}
        </button>
      </section>
    </main>
  )
}
