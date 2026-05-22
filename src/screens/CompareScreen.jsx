import { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { checkProductFit, formatPrice } from '../utils/fitCheck.js'
import { getDisplayQuantity } from '../utils/parseQuantity.js'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useStore } from '../contexts/StoreContext.jsx'
import { useI18n } from '../i18n/index.js'
import { useLocalName } from '../utils/localName.js'
import { getAnyKnownProductByRef } from '../utils/storeCatalog.js'
import { buildProductAIPath } from '../utils/routes.js'
import { buildProductComparison } from '../domain/product/comparison.js'

// ── Comparison helpers ───────────────────────────────────────────────────────
// ── Flavor extraction ─────────────────────────────────────────────────────────
const FLAVOR_KEYWORDS = [
  'клубнич',
  'шоколад',
  'ваниль',
  'карамел',
  'малин',
  'вишн',
  'апельсин',
  'лимон',
  'мяг',
  'сливоч',
  'кокос',
  'банан',
  'манго',
  'персик',
  'яблок',
  'арахис',
  'фундук',
  'солен',
  'остр',
  'сладк',
]

function extractFlavor(product) {
  const haystack =
    `${product.name || ''} ${(product.tags || []).join(' ')} ${product.description || ''}`.toLowerCase()
  for (const kw of FLAVOR_KEYWORDS) {
    if (haystack.includes(kw)) {
      const found = haystack.match(new RegExp(`\\S*${kw}\\S*`))
      if (found) return found[0].charAt(0).toUpperCase() + found[0].slice(1)
    }
  }
  return null
}

// ── Manufacturer display ──────────────────────────────────────────────────────
function getMfrText(product) {
  if (!product.manufacturer) return null
  if (typeof product.manufacturer === 'object') {
    const name = product.manufacturer.name || ''
    const country = product.manufacturer.country || product.specs?.country || ''
    return [name, country].filter(Boolean).join(' · ')
  }
  return String(product.manufacturer)
}

// ── Row definitions ──────────────────────────────────────────────────────────
function buildRows(productA, productB, t, lang) {
  const cat = productA.category || productB.category
  const rows = []

  const push = (label, getVal, compare = null) => {
    const a = getVal(productA)
    const b = getVal(productB)
    if (a == null && b == null) return
    rows.push({ label, a: a ?? '—', b: b ?? '—', compare })
  }

  // Universal
  push(t('compare.mfr'), getMfrText)
  push(t('compare.halal'), (p) => {
    const s = p.halalStatus
    if (s === 'yes') return t('compare.halalYes')
    if (s === 'no') return t('compare.halalNo')
    return p.halalStatus ? t('compare.halalUnk') : null
  })
  push(t('compare.price'), (p) => (p.priceKzt != null ? formatPrice(p.priceKzt) : null), 'price')

  // Food rows
  if (cat === 'grocery') {
    push(t('compare.flavor'), extractFlavor)
    push(t('compare.allergens'), (p) =>
      p.allergens?.length ? p.allergens.join(', ') : t('product.allergens') ? null : null
    )
    push(
      t('compare.protein'),
      (p) =>
        p.nutritionPer100?.protein != null
          ? `${p.nutritionPer100.protein} ${t('product.unitG')}`
          : null,
      'higher'
    )
    push(
      t('compare.fat'),
      (p) =>
        p.nutritionPer100?.fat != null ? `${p.nutritionPer100.fat} ${t('product.unitG')}` : null,
      'lower'
    )
    push(t('compare.carbs'), (p) =>
      p.nutritionPer100?.carbs != null ? `${p.nutritionPer100.carbs} ${t('product.unitG')}` : null
    )
    push(
      t('compare.kcal'),
      (p) =>
        p.nutritionPer100?.kcal != null
          ? `${p.nutritionPer100.kcal} ${t('product.unitKcal')}`
          : null,
      'lower'
    )
    push(t('compare.weight'), (p) => getDisplayQuantity(p, lang))
    push(t('compare.ingredients'), (p) =>
      p.ingredients ? p.ingredients.slice(0, 80) + (p.ingredients.length > 80 ? '...' : '') : null
    )
    push(t('compare.expiry'), (p) => p.specs?.bestBefore || p.expiry || null)
  }

  // Electronics
  if (cat === 'electronics') {
    push(t('compare.battery'), (p) => p.specs?.battery || null)
    push(t('compare.protection'), (p) => p.specs?.waterproof || null)
    push(t('compare.anc'), (p) => (p.specs?.anc != null ? String(p.specs.anc) : null))
    const seenKeys = new Set(['battery', 'waterproof', 'anc'])
    for (const p of [productA, productB]) {
      for (const [k] of Object.entries(p.specs || {})) {
        if (!seenKeys.has(k) && seenKeys.size < 8) {
          seenKeys.add(k)
          push(k, (prod) => (prod.specs?.[k] != null ? String(prod.specs[k]) : null))
        }
      }
    }
  }

  // DIY
  if (cat === 'diy') {
    push(t('compare.coverage'), (p) => p.specs?.coverage || null)
    push(t('compare.dryTime'), (p) => p.specs?.dryTime || null)
    push(t('compare.moisture'), (p) =>
      p.specs?.moisture != null ? String(p.specs.moisture) : null
    )
  }

  return rows
}

function isBetter(row, side) {
  if (row.a === '—' || row.b === '—') return false
  if (!row.compare) return false
  const parsePriceNum = (s) => parseFloat(String(s).replace(/[^\d.]/g, '')) || 0
  if (row.compare === 'price') {
    const nA = parsePriceNum(row.a)
    const nB = parsePriceNum(row.b)
    return side === 'a' ? nA < nB : nB < nA
  }
  const parseNum = (s) => parseFloat(String(s)) || 0
  const nA = parseNum(row.a)
  const nB = parseNum(row.b)
  if (row.compare === 'higher') return side === 'a' ? nA > nB : nB > nA
  if (row.compare === 'lower') return side === 'a' ? nA < nB : nB < nA
  return false
}

function getComparisonBarSplit(comparison) {
  if (!comparison || comparison.winner === 'draw') return 50
  if (comparison.winner === 'A') return comparison.confidence === 'clear' ? 64 : 56
  return comparison.confidence === 'clear' ? 36 : 44
}

function getComparisonToneKey(comparison) {
  if (!comparison || comparison.winner === 'draw') return 'draw'
  return comparison.confidence === 'clear' ? 'clear' : 'slight'
}

function getSideLabelKey(label) {
  if (label === 'best_choice') return 'compare.label.best'
  if (label === 'fits_but_check') return 'compare.label.check'
  if (label === 'choose_another') return 'compare.label.avoid'
  return 'compare.label.good'
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ProductPhoto({ product }) {
  const [ok, setOk] = useState(true)
  const src = product?.images?.[0] || (product?.ean ? `/products/${product.ean}.png` : null)
  if (!src || !ok) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          fontSize: 24,
          fontWeight: 800,
          color: '#A78BFA',
          background: 'rgba(124,58,237,0.08)',
        }}
      >
        {product?.name?.[0] || '?'}
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={product?.name || ''}
      onError={() => setOk(false)}
      className="product-img-blend"
      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }}
    />
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
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

  const winner = comparison?.winner || 'draw'
  const barSplit = getComparisonBarSplit(comparison)
  const toneKey = getComparisonToneKey(comparison)

  const rows = useMemo(() => {
    if (!productA || !productB) return []
    return buildRows(productA, productB, t, lang)
  }, [productA, productB, t, lang])

  // LLM call after initial render
  useEffect(() => {
    if (!productA || !productB) return
    setAiLoading(true)
    const ctrl = new AbortController()

    fetch('/api/ai', {
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
      .then((r) => r.json())
      .then((d) => {
        if (d.reply) setAiText(d.reply)
      })
      .catch(() => {})
      .finally(() => setAiLoading(false))

    return () => ctrl.abort()
  }, []) // eslint-disable-line

  if (!productA || !productB) {
    return (
      <div
        className="screen"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
        }}
      >
        <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 48,
              color: 'rgba(167,139,250,0.4)',
              marginBottom: 16,
              display: 'block',
            }}
          >
            compare_arrows
          </span>
          <p style={{ marginBottom: 16 }}>{t('common.notFound')}</p>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            {t('common.back')}
          </button>
        </div>
      </div>
    )
  }

  const winnerProduct = winner === 'A' ? productA : winner === 'B' ? productB : null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        background: 'var(--bg, #07070F)',
        overflow: 'hidden',
      }}
    >
      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          background: 'var(--bg-app)',
          borderBottom: '1px solid rgba(139,92,246,0.15)',
          zIndex: 20,
        }}
      >
        {/* Nav bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px 10px',
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, color: 'rgba(255,255,255,0.8)' }}
            >
              arrow_back
            </span>
          </button>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              fontWeight: 800,
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#A78BFA' }}>
              compare_arrows
            </span>
            {t('compare.title')}
          </div>
          <div style={{ width: 36 }} />
        </div>

        {/* Product headers — side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {[
            { product: productA, fit: fitA, side: 'A' },
            { product: productB, fit: fitB, side: 'B' },
          ].map(({ product, fit, side }) => (
            <div
              key={side}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px 10px 10px',
                borderLeft: side === 'B' ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}
            >
              <div
                className="catalog-img-box"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 14,
                  // Keep inline border and overflow to override if needed,
                  // but rely on catalog-img-box for the premium radial light source
                  border: '1px solid rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                  marginBottom: 7,
                  flexShrink: 0,
                }}
              >
                <ProductPhoto product={product} />
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text)',
                  textAlign: 'center',
                  lineHeight: 1.3,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginBottom: 6,
                  width: '100%',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {side === 'A' ? localNameA : localNameB}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: fit.fits ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  color: fit.fits ? '#34D399' : '#F87171',
                  border: `1px solid ${fit.fits ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                  {fit.fits ? 'check_circle' : 'cancel'}
                </span>
                {fit.fits ? t('compare.fitBadge') : t('compare.notFitBadge')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
        }}
      >
        {/* Comparison table */}
        <div style={{ marginBottom: 0 }}>
          {rows.map((row, idx) => {
            const betterA = isBetter(row, 'a')
            const betterB = isBetter(row, 'b')
            return (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  minHeight: 42,
                }}
              >
                {/* Value A */}
                <div
                  style={{
                    padding: '10px 10px 10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    fontSize: 12,
                    lineHeight: 1.35,
                    textAlign: 'right',
                    wordBreak: 'break-word',
                    background: betterA ? 'rgba(124,58,237,0.07)' : 'transparent',
                    fontWeight: betterA ? 700 : 400,
                    color: betterA ? '#C4B5FD' : 'rgba(220,220,240,0.75)',
                  }}
                >
                  {row.a}
                </div>

                {/* Label */}
                <div
                  style={{
                    padding: '10px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'rgba(180,160,240,0.55)',
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    borderLeft: '1px solid rgba(255,255,255,0.05)',
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(255,255,255,0.02)',
                    minWidth: 72,
                    maxWidth: 88,
                  }}
                >
                  {row.label}
                </div>

                {/* Value B */}
                <div
                  style={{
                    padding: '10px 14px 10px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    fontSize: 12,
                    lineHeight: 1.35,
                    textAlign: 'left',
                    wordBreak: 'break-word',
                    background: betterB ? 'rgba(124,58,237,0.07)' : 'transparent',
                    fontWeight: betterB ? 700 : 400,
                    color: betterB ? '#C4B5FD' : 'rgba(220,220,240,0.75)',
                  }}
                >
                  {row.b}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Winner Block ────────────────────────────────────────────── */}
        <div style={{ padding: '20px 16px 12px' }}>
          <div
            style={{
              borderRadius: 22,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(139,92,246,0.25)',
              backdropFilter: 'blur(16px)',
              padding: '20px 18px',
              boxShadow: '0 4px 32px rgba(124,58,237,0.12)',
            }}
          >
            {/* Bar header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(200,180,255,0.7)',
                marginBottom: 8,
                letterSpacing: '0.02em',
              }}
            >
              <span
                style={{
                  maxWidth: '40%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {productA.name}
              </span>
              <span
                style={{
                  maxWidth: '40%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textAlign: 'right',
                }}
              >
                {productB.name}
              </span>
            </div>

            {/* Progress bar */}
            <div
              style={{
                height: 10,
                borderRadius: 99,
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.06)',
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: `linear-gradient(90deg, #7C3AED ${barSplit}%, rgba(139,92,246,0.25) ${barSplit}%)`,
                  borderRadius: 99,
                  transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)',
                }}
              />
            </div>

            {/* Result labels */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                fontWeight: 800,
                fontFamily: 'var(--font-display)',
                marginBottom: 16,
                textTransform: 'uppercase',
              }}
            >
              <span style={{ color: winner === 'A' ? '#C4B5FD' : 'rgba(180,160,230,0.5)' }}>
                {t(getSideLabelKey(comparison?.a?.label))}
              </span>
              <span style={{ color: winner === 'B' ? '#C4B5FD' : 'rgba(180,160,230,0.5)' }}>
                {t(getSideLabelKey(comparison?.b?.label))}
              </span>
            </div>

            {/* Winner title */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  flexShrink: 0,
                  background:
                    winner === 'draw' ? 'rgba(148,163,184,0.12)' : 'rgba(124,58,237,0.18)',
                  border: `1px solid ${winner === 'draw' ? 'rgba(148,163,184,0.25)' : 'rgba(167,139,250,0.35)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 20,
                    color: winner === 'draw' ? '#94A3B8' : '#C4B5FD',
                  }}
                >
                  {winner === 'draw' ? 'balance' : 'workspace_premium'}
                </span>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 15,
                    fontWeight: 800,
                    color: winner === 'draw' ? '#94A3B8' : '#E9D5FF',
                  }}
                >
                  {winner === 'draw'
                    ? t('compare.draw')
                    : `${winnerProduct.name} ${t('compare.better')}`}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'rgba(220,210,255,0.68)',
                    lineHeight: 1.35,
                  }}
                >
                  {t(`compare.reason.${comparison?.summaryKey || 'similar_fit'}`, {
                    name: winnerProduct?.name || '',
                  })}
                </div>
                <div
                  style={{
                    marginTop: 5,
                    fontSize: 10,
                    fontWeight: 800,
                    color: 'rgba(180,160,230,0.56)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  {t(`compare.confidence.${toneKey}`)}
                </div>
              </div>
            </div>

            {/* LLM commentary */}
            {(aiLoading || aiText) && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: 'rgba(124,58,237,0.08)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  marginBottom: 14,
                }}
              >
                {aiLoading && !aiText ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        border: '2px solid rgba(167,139,250,0.25)',
                        borderTop: '2px solid #A78BFA',
                        animation: 'compareSpinAnim 0.8s linear infinite',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 12, color: 'rgba(180,160,240,0.6)' }}>
                      {t('compare.aiLoading')}
                    </span>
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: 13,
                      color: 'rgba(220,210,255,0.82)',
                      lineHeight: 1.55,
                      margin: 0,
                    }}
                  >
                    {aiText}
                  </p>
                )}
              </div>
            )}

            {/* Ask AI button */}
            <button
              onClick={() =>
                navigate(buildProductAIPath(activeSlug, (winnerProduct || productA).ean))
              }
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 14,
                cursor: 'pointer',
                background: 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(139,92,246,0.35)',
                color: '#C4B5FD',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                auto_awesome
              </span>
              {t('compare.askMore')}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes compareSpinAnim { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
