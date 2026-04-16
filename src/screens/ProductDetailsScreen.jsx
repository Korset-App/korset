import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/* ────────────────────────────────────────────────────────────────────────────
   Körset — Product Details Screen (Premium redesign)
   Mobile-first, dark glassmorphism, self-contained showcase.
   ──────────────────────────────────────────────────────────────────────────── */

const DEMO_PRODUCT = {
  id: 'p006',
  ean: '4820000000006',
  name: 'Protein Bar — Dark Chocolate & Almond',
  nameRu: 'Батончик протеиновый · тёмный шоколад, миндаль',
  manufacturer: 'NorthFit Nutrition Co.',
  priceKzt: 1290,
  shelf: 'Snacks · Shelf S-1',
  category: 'Sports nutrition',
  images: [
    '/products/snickers.png',
    '/products/1.png',
    '/products/2.png',
  ],
  imageLabels: ['Front', 'Back', 'Ingredients'],
  dietTags: [
    { key: 'halal', label: 'Halal', emoji: '🕌' },
    { key: 'no_sugar', label: 'No Added Sugar', emoji: '🍬' },
    { key: 'high_protein', label: 'High Protein', emoji: '💪' },
    { key: 'gluten_free', label: 'Gluten Free', emoji: '🌾' },
    { key: 'vegan_friendly', label: 'Veg. Friendly', emoji: '🌱' },
    { key: 'keto', label: 'Keto', emoji: '🥑' },
  ],
  nutrition: {
    kcal: 214,
    protein: 18,
    fat: 9.2,
    carbs: 14,
    sugar: 2.1,   // g / 100g  — low
    salt: 0.9,    // g / 100g  — medium
  },
  // Ingredient tokens: plain text + danger flags (allergens / bad additives)
  ingredients: [
    { t: 'Whey protein isolate' },
    { t: 'Almonds', danger: true, reason: 'Tree nut allergen' },
    { t: 'Cocoa mass' },
    { t: 'Soluble corn fibre' },
    { t: 'Milk powder', danger: true, reason: 'Contains milk' },
    { t: 'Natural flavouring' },
    { t: 'Sweetener (stevia)' },
    { t: 'Sea salt' },
    { t: 'Emulsifier (E322 — soy lecithin)' },
    { t: 'E171', danger: true, reason: 'Titanium dioxide — avoid' },
    { t: 'Antioxidant (tocopherols)' },
  ],
}

/* ── Icons ─────────────────────────────────────────────────────────────────── */

const Icon = ({ d, size = 20, stroke = 'currentColor', fill = 'none', sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
)

const IconBack = (p) => <Icon {...p} d="M15 18l-6-6 6-6" />
const IconHeart = ({ filled, ...p }) => (
  <Icon {...p} fill={filled ? '#F43F5E' : 'none'} stroke={filled ? '#F43F5E' : 'currentColor'}
    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
)
const IconCheck = (p) => <Icon {...p} d="M20 6L9 17l-5-5" sw={2.5} />
const IconX = (p) => <Icon {...p} d="M18 6L6 18M6 6l12 12" sw={2.5} />
const IconChevronDown = (p) => <Icon {...p} d="M6 9l6 6 6-6" />
const IconSparkle = (p) => (
  <Icon {...p} fill="currentColor" stroke="none" d="M12 2l1.8 5.3L19 9l-5.2 1.7L12 16l-1.8-5.3L5 9l5.2-1.7L12 2zm7 11l.9 2.6 2.6.9-2.6.9L19 20l-.9-2.6L15.5 16.5l2.6-.9L19 13z" />
)
const IconSwap = (p) => <Icon {...p} d="M7 7h13M7 7l4-4M7 7l4 4M17 17H4m13 0l-4-4m4 4l-4 4" />
const IconBox = (p) => <Icon {...p} d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12" />

/* ── Helpers ───────────────────────────────────────────────────────────────── */

const formatKzt = (n) => n.toLocaleString('ru-RU') + ' ₸'

// UK Traffic-Light thresholds (per 100g, solid foods)
function trafficLightSugar(g) {
  if (g <= 5) return { level: 'low', label: 'Low', color: '#10B981' }
  if (g <= 22.5) return { level: 'med', label: 'Medium', color: '#F59E0B' }
  return { level: 'high', label: 'High', color: '#F43F5E' }
}
function trafficLightSalt(g) {
  if (g <= 0.3) return { level: 'low', label: 'Low', color: '#10B981' }
  if (g <= 1.5) return { level: 'med', label: 'Medium', color: '#F59E0B' }
  return { level: 'high', label: 'High', color: '#F43F5E' }
}

/* ── Sub-components ────────────────────────────────────────────────────────── */

function HeaderBar({ onBack, favorite, onFavorite }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        padding: '14px 16px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        background: 'linear-gradient(180deg, rgba(7,7,15,0.88) 0%, rgba(7,7,15,0.55) 100%)',
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <GlassIconBtn onClick={onBack} aria-label="Back">
        <IconBack />
      </GlassIconBtn>

      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: 'var(--text)',
        }}
      >
        Product Details
      </div>

      <GlassIconBtn
        onClick={onFavorite}
        aria-label="Favorite"
        active={favorite}
        accent="#F43F5E"
      >
        <IconHeart filled={favorite} />
      </GlassIconBtn>
    </header>
  )
}

function GlassIconBtn({ children, active, accent = '#A78BFA', style, ...rest }) {
  return (
    <button
      {...rest}
      style={{
        width: 40,
        height: 40,
        borderRadius: 14,
        display: 'grid',
        placeItems: 'center',
        border: `1px solid ${active ? `${accent}55` : 'rgba(255,255,255,0.08)'}`,
        background: active
          ? `${accent}1F`
          : 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        color: active ? accent : 'rgba(255,255,255,0.9)',
        cursor: 'pointer',
        transition: 'transform .18s ease, background .2s ease, border-color .2s ease',
        ...style,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {children}
    </button>
  )
}

function HeroGallery({ images, labels }) {
  const scrollerRef = useRef(null)
  const [index, setIndex] = useState(0)

  const onScroll = () => {
    const el = scrollerRef.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== index) setIndex(i)
  }

  const goTo = (i) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div style={{ position: 'relative', padding: '16px 16px 0' }}>
      <div
        style={{
          position: 'relative',
          borderRadius: 28,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          background:
            'radial-gradient(120% 80% at 20% 0%, rgba(124,58,237,0.32) 0%, rgba(124,58,237,0.08) 38%, rgba(255,255,255,0.02) 72%)',
          boxShadow:
            '0 30px 60px -30px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Slides */}
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          style={{
            display: 'flex',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <style>{`.korset-hero-scroller::-webkit-scrollbar{display:none}`}</style>
          {images.map((src, i) => (
            <div
              key={i}
              style={{
                flex: '0 0 100%',
                scrollSnapAlign: 'center',
                aspectRatio: '1 / 1',
                display: 'grid',
                placeItems: 'center',
                padding: 28,
                position: 'relative',
              }}
            >
              <img
                src={src || '/placeholder.svg'}
                alt={labels?.[i] || `Product image ${i + 1}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.55))',
                }}
                crossOrigin="anonymous"
              />
              {/* subtle label chip */}
              <span
                style={{
                  position: 'absolute',
                  top: 14,
                  left: 14,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.75)',
                  padding: '5px 10px',
                  borderRadius: 999,
                  background: 'rgba(12,12,24,0.55)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                }}
              >
                {labels?.[i] || `Photo ${i + 1}`}
              </span>
            </div>
          ))}
        </div>

        {/* Counter pill */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            fontSize: 11,
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.85)',
            padding: '5px 10px',
            borderRadius: 999,
            background: 'rgba(12,12,24,0.55)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          {index + 1} / {images.length}
        </div>
      </div>

      {/* Dots */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          padding: '14px 0 6px',
        }}
      >
        {images.map((_, i) => {
          const active = i === index
          return (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                height: 6,
                width: active ? 22 : 6,
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: active
                  ? 'linear-gradient(90deg, #A78BFA, #7C3AED)'
                  : 'rgba(255,255,255,0.18)',
                boxShadow: active ? '0 0 12px rgba(167,139,250,0.6)' : 'none',
                transition: 'all .25s ease',
                padding: 0,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function FitCheckBadge({ safe, onToggle }) {
  const theme = safe
    ? {
        bg: 'linear-gradient(180deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.10) 100%)',
        border: 'rgba(16,185,129,0.35)',
        glow: '0 20px 40px -22px rgba(16,185,129,0.55)',
        ring: 'rgba(16,185,129,0.22)',
        icon: '#10B981',
        text: '#6EE7B7',
        subtle: 'rgba(167,243,208,0.75)',
        title: 'Safe to eat',
        reason: 'Matches your profile — no allergens, no added sugar.',
      }
    : {
        bg: 'linear-gradient(180deg, rgba(244,63,94,0.20) 0%, rgba(190,18,60,0.10) 100%)',
        border: 'rgba(244,63,94,0.38)',
        glow: '0 20px 40px -22px rgba(244,63,94,0.55)',
        ring: 'rgba(244,63,94,0.22)',
        icon: '#F43F5E',
        text: '#FDA4AF',
        subtle: 'rgba(254,205,211,0.78)',
        title: 'Not safe for you',
        reason: 'Contains almonds (tree nuts) — flagged in your allergen profile.',
      }

  return (
    <div style={{ padding: '8px 16px 0' }}>
      <button
        onClick={onToggle}
        aria-label="Toggle fit status"
        style={{
          width: '100%',
          textAlign: 'left',
          border: `1px solid ${theme.border}`,
          background: theme.bg,
          backdropFilter: 'blur(16px) saturate(160%)',
          WebkitBackdropFilter: 'blur(16px) saturate(160%)',
          borderRadius: 20,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          cursor: 'pointer',
          boxShadow: theme.glow,
          transition: 'all .3s ease',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            display: 'grid',
            placeItems: 'center',
            background: theme.ring,
            color: theme.icon,
            border: `1px solid ${theme.border}`,
            flexShrink: 0,
          }}
        >
          {safe ? <IconCheck size={22} /> : <IconX size={22} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 15,
              fontWeight: 700,
              color: theme.text,
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}
          >
            {theme.title}
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: theme.subtle,
              marginTop: 3,
              lineHeight: 1.35,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {theme.reason}
          </div>
        </div>

        <span
          aria-hidden
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: theme.text,
            opacity: 0.7,
            padding: '4px 8px',
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            background: 'rgba(0,0,0,0.25)',
          }}
        >
          Tap
        </span>
      </button>
    </div>
  )
}

function BasicInfo({ product }) {
  return (
    <div style={{ padding: '18px 16px 10px' }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)',
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        {product.category}
      </div>

      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          fontWeight: 800,
          lineHeight: 1.18,
          letterSpacing: '-0.02em',
          color: 'var(--text)',
          marginBottom: 6,
        }}
      >
        {product.name}
      </h1>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 14 }}>
        {product.nameRu}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #C4B5FD 0%, #A78BFA 40%, #7C3AED 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {formatKzt(product.priceKzt)}
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
              fontWeight: 500,
              marginLeft: 2,
            }}
          >
            /60g
          </span>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 11.5,
            color: 'rgba(255,255,255,0.75)',
            fontWeight: 500,
          }}
        >
          <span style={{ opacity: 0.7 }}>
            <IconBox size={13} />
          </span>
          {product.shelf}
        </div>
      </div>

      <div
        style={{
          fontSize: 12.5,
          color: 'rgba(255,255,255,0.45)',
          marginTop: 10,
        }}
      >
        by <span style={{ color: 'rgba(255,255,255,0.7)' }}>{product.manufacturer}</span>
      </div>
    </div>
  )
}

function DietBadges({ tags }) {
  return (
    <div
      style={{
        padding: '6px 0 10px',
        marginLeft: 16,
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
      className="korset-hide-scroll"
    >
      <style>{`.korset-hide-scroll::-webkit-scrollbar{display:none}`}</style>
      <div style={{ display: 'inline-flex', gap: 8, paddingRight: 16 }}>
        {tags.map((tg) => (
          <span
            key={tg.key}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.88)',
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.005em',
            }}
          >
            <span style={{ fontSize: 13 }} aria-hidden>{tg.emoji}</span>
            {tg.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function SectionTitle({ children, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: 'rgba(255,255,255,0.55)',
        }}
      >
        {children}
      </h2>
      {hint && (
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
          {hint}
        </span>
      )}
    </div>
  )
}

function MacroCard({ label, value, unit, accent = '#A78BFA' }) {
  return (
    <div
      style={{
        position: 'relative',
        padding: '14px 14px 12px',
        borderRadius: 18,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        overflow: 'hidden',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(120% 80% at 100% 0%, ${accent}26 0%, transparent 55%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.55)',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          display: 'flex',
          alignItems: 'baseline',
          gap: 3,
          fontFamily: 'var(--font-display)',
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          {value}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{unit}</span>
      </div>
    </div>
  )
}

function TrafficRow({ label, value, unit, tl }) {
  const positions = { low: '16%', med: '50%', high: '84%' }
  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 18,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>{label}</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '2px 7px',
              borderRadius: 6,
              color: tl.color,
              background: `${tl.color}1A`,
              border: `1px solid ${tl.color}33`,
            }}
          >
            {tl.label}
          </span>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 13,
            color: 'var(--text)',
            fontWeight: 700,
          }}
        >
          {value}
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginLeft: 3, fontWeight: 600 }}>
            {unit}
          </span>
        </div>
      </div>

      {/* Segmented bar */}
      <div style={{ position: 'relative', height: 6 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            gap: 3,
            borderRadius: 999,
            overflow: 'hidden',
            opacity: 0.25,
          }}
        >
          <div style={{ flex: 1, background: '#10B981' }} />
          <div style={{ flex: 1, background: '#F59E0B' }} />
          <div style={{ flex: 1, background: '#F43F5E' }} />
        </div>
        {/* Active indicator dot */}
        <div
          style={{
            position: 'absolute',
            top: -3,
            left: positions[tl.level],
            transform: 'translateX(-50%)',
            width: 12,
            height: 12,
            borderRadius: 999,
            background: tl.color,
            boxShadow: `0 0 0 3px rgba(7,7,15,0.9), 0 0 12px ${tl.color}`,
          }}
        />
      </div>
    </div>
  )
}

function NutritionBlock({ n }) {
  const sugarTl = trafficLightSugar(n.sugar)
  const saltTl = trafficLightSalt(n.salt)
  return (
    <section style={{ padding: '10px 16px 8px' }}>
      <SectionTitle hint="per 100 g">Nutrition & Macros</SectionTitle>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <MacroCard label="Calories" value={n.kcal} unit="kcal" accent="#A78BFA" />
        <MacroCard label="Protein" value={n.protein} unit="g" accent="#34D399" />
        <MacroCard label="Fat" value={n.fat} unit="g" accent="#FBBF24" />
        <MacroCard label="Carbs" value={n.carbs} unit="g" accent="#60A5FA" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        <TrafficRow label="Sugar" value={n.sugar} unit="g" tl={sugarTl} />
        <TrafficRow label="Salt" value={n.salt} unit="g" tl={saltTl} />
      </div>
    </section>
  )
}

function Ingredients({ list }) {
  const [expanded, setExpanded] = useState(false)

  const paragraph = useMemo(() => {
    return list.map((ing, i) => {
      const isLast = i === list.length - 1
      const sep = isLast ? '.' : ', '
      if (ing.danger) {
        return (
          <span key={i}>
            <span
              title={ing.reason}
              style={{
                color: '#FDA4AF',
                background: 'rgba(244,63,94,0.14)',
                border: '1px solid rgba(244,63,94,0.28)',
                padding: '1px 6px',
                borderRadius: 6,
                fontWeight: 700,
                boxDecorationBreak: 'clone',
                WebkitBoxDecorationBreak: 'clone',
              }}
            >
              {ing.t}
            </span>
            {sep}
          </span>
        )
      }
      return <span key={i}>{ing.t}{sep}</span>
    })
  }, [list])

  return (
    <section style={{ padding: '4px 16px 6px' }}>
      <SectionTitle hint="Состав">Ingredients</SectionTitle>

      <div
        style={{
          position: 'relative',
          padding: '14px 14px',
          borderRadius: 18,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.82)',
            display: expanded ? 'block' : '-webkit-box',
            WebkitLineClamp: expanded ? 'unset' : 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            margin: 0,
          }}
        >
          {paragraph}
        </p>

        {/* Fade gradient when collapsed */}
        {!expanded && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 14,
              right: 14,
              bottom: 40,
              height: 28,
              pointerEvents: 'none',
              background:
                'linear-gradient(180deg, rgba(12,12,24,0) 0%, rgba(12,12,24,0.85) 100%)',
              borderRadius: 4,
            }}
          />
        )}

        <button
          onClick={() => setExpanded((s) => !s)}
          aria-label={expanded ? 'Collapse ingredients' : 'Expand ingredients'}
          style={{
            marginTop: 8,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 10px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all .18s ease',
          }}
        >
          {expanded ? 'Show less' : 'Read more'}
          <span
            style={{
              display: 'inline-flex',
              transition: 'transform .25s ease',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <IconChevronDown size={14} />
          </span>
        </button>

        {/* Allergen legend */}
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11.5,
            color: 'rgba(253,164,175,0.9)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: '#F43F5E',
              boxShadow: '0 0 10px rgba(244,63,94,0.7)',
            }}
          />
          Highlighted items conflict with your profile
        </div>
      </div>
    </section>
  )
}

function StickyActions({ onAlternatives, onAskAI, onCompare }) {
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 30,
        padding: '10px 16px calc(14px + env(safe-area-inset-bottom, 0px))',
        background:
          'linear-gradient(180deg, rgba(7,7,15,0) 0%, rgba(7,7,15,0.88) 40%, rgba(7,7,15,0.98) 100%)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        {/* Alternatives — glass outlined */}
        <button
          onClick={onAlternatives}
          style={{
            flex: 1,
            height: 52,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            color: 'rgba(255,255,255,0.92)',
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            letterSpacing: '-0.005em',
          }}
        >
          Alternatives
        </button>

        {/* Ask AI — premium shining gradient */}
        <button
          onClick={onAskAI}
          style={{
            flex: 1.1,
            position: 'relative',
            height: 52,
            borderRadius: 16,
            border: '1px solid rgba(167,139,250,0.55)',
            background:
              'linear-gradient(120deg, #7C3AED 0%, #A78BFA 45%, #8B5CF6 60%, #C4B5FD 100%)',
            color: 'white',
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '-0.005em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow:
              '0 10px 30px -10px rgba(124,58,237,0.75), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -8px 20px rgba(76,29,149,0.35)',
            overflow: 'hidden',
          }}
        >
          {/* animated sheen */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0.0) 60%)',
              transform: 'translateX(-100%)',
              animation: 'korsetSheen 2.8s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
          <IconSparkle size={16} />
          <span>Ask AI</span>
          <span style={{ fontSize: 14, lineHeight: 1 }}>✨</span>
        </button>
      </div>

      <button
        onClick={onCompare}
        style={{
          width: '100%',
          height: 44,
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
          color: 'rgba(255,255,255,0.78)',
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.01em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <IconSwap size={15} />
        Compare with another product
      </button>
    </div>
  )
}

/* ── Main Screen ───────────────────────────────────────────────────────────── */

export default function ProductDetailsScreen() {
  const navigate = useNavigate()
  const [favorite, setFavorite] = useState(false)
  const [safe, setSafe] = useState(false) // false = "Not safe" (has almonds) — shown by default to demo highlighting

  useEffect(() => {
    // Ensure body background matches theme while this screen is mounted
    document.documentElement.style.background = 'var(--bg, #07070F)'
  }, [])

  return (
    <>
      {/* Keyframes for premium shine */}
      <style>{`
        @keyframes korsetSheen {
          0%   { transform: translateX(-120%); }
          55%  { transform: translateX(120%); }
          100% { transform: translateX(120%); }
        }
        @keyframes korsetFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className="screen"
        style={{
          paddingBottom: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          background:
            'radial-gradient(140% 60% at 50% -20%, rgba(124,58,237,0.22) 0%, rgba(124,58,237,0.04) 40%, transparent 70%), var(--bg, #07070F)',
        }}
      >
        <HeaderBar
          onBack={() => navigate(-1)}
          favorite={favorite}
          onFavorite={() => setFavorite((s) => !s)}
        />

        <div
          style={{
            flex: 1,
            animation: 'korsetFadeUp .35s cubic-bezier(0.22, 1, 0.36, 1) both',
          }}
        >
          <HeroGallery images={DEMO_PRODUCT.images} labels={DEMO_PRODUCT.imageLabels} />

          <FitCheckBadge safe={safe} onToggle={() => setSafe((s) => !s)} />

          <BasicInfo product={DEMO_PRODUCT} />

          <DietBadges tags={DEMO_PRODUCT.dietTags} />

          <NutritionBlock n={DEMO_PRODUCT.nutrition} />

          <Ingredients list={DEMO_PRODUCT.ingredients} />

          {/* Spacer so sticky actions don't cover content */}
          <div style={{ height: 24 }} />
        </div>

        <StickyActions
          onAlternatives={() => {}}
          onAskAI={() => {}}
          onCompare={() => {}}
        />
      </div>
    </>
  )
}
