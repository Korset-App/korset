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
import { CompareIcon } from '../components/icons/CompareIcon.jsx'
import './CompareScreen.css'

function getComparisonBarSplit(comparisonView) {
  if (!comparisonView || comparisonView.status !== 'winner') return 50
  if (comparisonView.winnerSide === 'A') return comparisonView.confidence === 'clear' ? 66 : 58
  return comparisonView.confidence === 'clear' ? 34 : 42
}

function getVerdictStateClass(comparisonView) {
  if (comparisonView?.status === 'blocked') return 'compare-verdict-card--blocked'
  if (comparisonView?.status === 'draw') return 'compare-verdict-card--draw'
  if (comparisonView?.winnerSide === 'A') return 'compare-verdict-card--winner-a'
  if (comparisonView?.winnerSide === 'B') return 'compare-verdict-card--winner-b'
  return 'compare-verdict-card--draw'
}

function getVerdictMark(comparisonView) {
  if (comparisonView?.status === 'blocked') return '!'
  if (comparisonView?.status === 'draw') return '≈'
  return comparisonView?.winnerSide || '≈'
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

function Icon({ name, className = '' }) {
  const iconClass = `compare-icon ${className}`.trim()

  if (name === 'back') {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M14.5 5.5 8 12l6.5 6.5" />
        <path d="M9 12h10" />
      </svg>
    )
  }

  if (name === 'compare') {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 6h11" />
        <path d="m15 3 3 3-3 3" />
        <path d="M17 18H6" />
        <path d="m9 15-3 3 3 3" />
      </svg>
    )
  }

  if (name === 'safe') {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="8" />
        <path d="m8.8 12.2 2.1 2.1 4.5-4.8" />
      </svg>
    )
  }

  if (name === 'danger' || name === 'blocked') {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="8" />
        <path d="m9 9 6 6" />
        <path d="m15 9-6 6" />
      </svg>
    )
  }

  if (name === 'warning' || name === 'caution' || name === 'preliminary' || name === 'data') {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 4.5 20 18H4l8-13.5Z" />
        <path d="M12 9v4" />
        <path d="M12 16h.01" />
      </svg>
    )
  }

  if (name === 'draw') {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 8h10" />
        <path d="M5.5 16h13" />
        <path d="M9 5.5 7 8l2 2.5" />
        <path d="m15 13.5 3 2.5-3 2.5" />
      </svg>
    )
  }

  if (name === 'profile') {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="10" cy="8" r="3" />
        <path d="M4.5 18c.9-3 2.8-4.5 5.5-4.5 1.3 0 2.4.3 3.2 1" />
        <path d="m15 17 2 2 3.5-4" />
      </svg>
    )
  }

  if (name === 'category' || name === 'explore') {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 5h6v6H5z" />
        <path d="M13 5h6v6h-6z" />
        <path d="M5 13h6v6H5z" />
        <path d="M14 16h5" />
        <path d="M16.5 13.5v5" />
      </svg>
    )
  }

  if (name === 'ai') {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3.5 13.6 9l5.4 1.5-5.4 1.6L12 17.5l-1.6-5.4L5 10.5 10.4 9 12 3.5Z" />
        <path d="M18 15.5 18.7 18l2.3.7-2.3.7-.7 2.1-.7-2.1-2.3-.7 2.3-.7.7-2.5Z" />
      </svg>
    )
  }

  return (
    <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12 2.4 2.4 4.8-5" />
    </svg>
  )
}

function getFitIconName(severityKey) {
  if (severityKey === 'safe') return 'safe'
  if (severityKey === 'danger') return 'danger'
  if (severityKey === 'warning') return 'warning'
  return 'caution'
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
        <Icon name={getFitIconName(badge.key)} />
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

function getRowValue(row, side, t) {
  const key = side === 'A' ? row.valueAKey : row.valueBKey
  const value = side === 'A' ? row.valueA : row.valueB
  if (key) return t(key)
  return value || '—'
}

function DataRow({ row, t }) {
  const winsA = row.winnerSide === 'A'
  const winsB = row.winnerSide === 'B'

  return (
    <article className={`compare-data-row ${row.winnerSide ? 'compare-data-row--has-winner' : ''}`}>
      <div className={`compare-data-value compare-data-value--a ${winsA ? 'is-winner' : ''}`}>
        {getRowValue(row, 'A', t)}
      </div>
      <div className="compare-data-label">{t(row.labelKey)}</div>
      <div className={`compare-data-value compare-data-value--b ${winsB ? 'is-winner' : ''}`}>
        {getRowValue(row, 'B', t)}
      </div>
    </article>
  )
}

function CompareNote({ tone = 'neutral', icon, children }) {
  return (
    <div className={`compare-note compare-note--${tone}`}>
      <Icon name={icon} />
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
    return buildProductComparisonViewModel({ productA, productB, comparison, profile, lang })
  }, [productA, productB, comparison, profile, lang])

  const winner = comparisonView?.winnerSide || 'draw'
  const barSplit = getComparisonBarSplit(comparisonView)

  useEffect(() => {
    if (!productA || !productB || !comparisonView) return undefined
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return undefined

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
        if (mounted && error.name !== 'AbortError') setAiText(null)
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
          <Icon name="compare" />
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
            <Icon name="back" />
          </button>
          <div className="compare-title" translate="no">
            <CompareIcon size={18} />
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
        {comparisonView.dataRows.length > 0 && (
          <section className="compare-data-section" aria-labelledby="compare-data-title">
            <div className="compare-section-heading">
              <span>A</span>
              <h2 id="compare-data-title">{t('compare.section.data')}</h2>
              <span>B</span>
            </div>
            <div className="compare-data-grid">
              {comparisonView.dataRows.map((row) => (
                <DataRow key={row.id} row={row} t={t} />
              ))}
            </div>
          </section>
        )}

        {(comparisonView.profileNote || comparisonView.dataNote || isBlocked) && (
          <section className="compare-notes" aria-label={t('compare.section.data')}>
            {isBlocked && (
              <CompareNote tone="blocked" icon="category">
                {t('compare.reason.different_category')}
              </CompareNote>
            )}
            {comparisonView.profileNote && (
              <CompareNote tone="profile" icon="profile">
                {t(comparisonView.profileNote.messageKey)}
                {profilePreferenceName ? ` ${profilePreferenceName}.` : ''}
              </CompareNote>
            )}
            {comparisonView.dataNote && (
              <CompareNote tone="data" icon="data">
                {t(comparisonView.dataNote.messageKey)}
              </CompareNote>
            )}
          </section>
        )}

        {comparisonView.topFactors.length > 0 && (
          <section className="compare-factors" aria-labelledby="compare-factors-title">
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

        <section
          className={`compare-verdict-card ${getVerdictStateClass(comparisonView)}`}
          aria-labelledby="compare-verdict-title"
        >
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
              <CompareIcon active={winner === 'B'} size={22} />
              <span>{getVerdictMark(comparisonView)}</span>
            </div>
          )}

          <div className="compare-verdict-main">
            <div className="compare-verdict-icon">
              <CompareIcon active={winner === 'B'} size={30} />
              <span className="compare-verdict-mark">{getVerdictMark(comparisonView)}</span>
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
          <Icon name={isBlocked ? 'explore' : 'ai'} />
          {actionLabel}
        </button>
      </section>
    </main>
  )
}
