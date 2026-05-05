import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LandingScreen.css'
import { useI18n } from '../i18n/index.js'
import useReveal from '../hooks/useReveal.js'

function collectStrArr(t, exists, prefix) {
  const arr = []
  let i = 0
  while (exists(`${prefix}.${i}`)) {
    arr.push(t(`${prefix}.${i}`))
    i++
  }
  return arr
}

function collectObjArr(t, exists, prefix, fields) {
  const arr = []
  let i = 0
  while (exists(`${prefix}.${i}.${fields[0]}`)) {
    const obj = {}
    fields.forEach((f) => {
      obj[f] = exists(`${prefix}.${i}.${f}`) ? t(`${prefix}.${i}.${f}`) : ''
    })
    arr.push(obj)
    i++
  }
  return arr
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M3.75 9h10.5M9 3.75 14.25 9 9 14.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M11 8v16l13-8L11 8z" fill="currentColor" />
    </svg>
  )
}

function CheckMicroIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="m3 7.4 2.6 2.6L11 4.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronIcon({ className }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="6.5" fill="rgba(74,222,128,0.15)" stroke="rgba(74,222,128,0.4)" />
      <path
        d="m4 7.2 2 2L10 5"
        stroke="#4ade80"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FitIcon({ tone }) {
  if (tone === 'good') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle
          cx="14"
          cy="14"
          r="13"
          fill="rgba(52,211,153,0.18)"
          stroke="rgba(52,211,153,0.45)"
          strokeWidth="1.5"
        />
        <path
          d="M8 14.6 11.4 18 20 10"
          stroke="#34d399"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (tone === 'warn') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path
          d="M14 3 2 24h24L14 3z"
          fill="rgba(251,191,36,0.18)"
          stroke="rgba(251,191,36,0.5)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M14 12v6" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        <circle cx="14" cy="21" r="1.2" fill="#fbbf24" />
      </svg>
    )
  }
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle
        cx="14"
        cy="14"
        r="13"
        fill="rgba(248,113,113,0.18)"
        stroke="rgba(248,113,113,0.45)"
        strokeWidth="1.5"
      />
      <path d="M9 9l10 10M19 9L9 19" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function FitExampleProduct({ tone }) {
  const products = {
    good: { emoji: '🥛', name: 'Молоко 2.5%', note: 'Нет аллергенов · Халал ✓' },
    warn: { emoji: '🍫', name: 'Шоколад молочный', note: 'Следы орехов · Лактоза' },
    bad: { emoji: '🌾', name: 'Хлеб пшеничный', note: 'Глютен — критичный аллерген' },
  }
  const p = products[tone] || products.good
  return (
    <div className={`lp-fit__card-product lp-fit__card-product--${tone}`}>
      <span className="lp-fit__card-product-emoji" aria-hidden="true">
        {p.emoji}
      </span>
      <div>
        <div className="lp-fit__card-product-name">{p.name}</div>
        <div className="lp-fit__card-product-note">{p.note}</div>
      </div>
    </div>
  )
}

function AlternativesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M3 9h12M9 3l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const AUDIENCE_PHOTOS = [
  'https://images.unsplash.com/photo-1576671081837-49000212a370?auto=format&fit=crop&w=640&q=75',
  'https://images.unsplash.com/photo-1569701813229-33284b643e3c?auto=format&fit=crop&w=640&q=75',
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=640&q=75',
  'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=640&q=75',
]

function FeatScreenShell({ children }) {
  return (
    <div className="lp-feat-screen">
      <div className="lp-feat-screen__bar" aria-hidden="true">
        <div className="lp-feat-screen__bar-logo">
          <img src="/icon_logo.svg" alt="" width="12" height="12" />
        </div>
        <span>Körset</span>
      </div>
      {children}
    </div>
  )
}

function MockupFitCheck({ phone, fit }) {
  return (
    <FeatScreenShell>
      <div className="lp-feat-screen__product">
        <span className="lp-feat-screen__emoji" aria-hidden="true">
          🥛
        </span>
        <div>
          <div className="lp-feat-screen__pname">{phone.productName}</div>
          <div className="lp-feat-screen__pmeta">{phone.productMeta}</div>
        </div>
      </div>
      <div className="lp-feat-screen__verdict lp-feat-screen__verdict--good">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="rgba(52,211,153,0.2)" stroke="rgba(52,211,153,0.5)" />
          <path
            d="M5 8.4 7 10.4 11 6"
            stroke="#34d399"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{fit.cards[0]?.title}</span>
      </div>
      <div className="lp-feat-screen__rows">
        <div className="lp-feat-screen__row">
          <span>{phone.allergen}</span>
          <span className="c-ok">{phone.allergenOk}</span>
        </div>
        <div className="lp-feat-screen__row">
          <span>{phone.halal}</span>
          <span className="c-ok">{phone.halalOk}</span>
        </div>
        <div className="lp-feat-screen__row">
          <span>КБЖУ</span>
          <span className="c-cyan">{phone.kbju}</span>
        </div>
      </div>
    </FeatScreenShell>
  )
}

function MockupKbju() {
  return (
    <FeatScreenShell>
      <div className="lp-feat-screen__product">
        <span className="lp-feat-screen__emoji" aria-hidden="true">
          🧀
        </span>
        <div>
          <div className="lp-feat-screen__pname">Сыр Гауда 45%</div>
          <div className="lp-feat-screen__pmeta">200 г · EAN 4607049...</div>
        </div>
      </div>
      <div className="lp-feat-screen__section-label">Состав</div>
      <div className="lp-feat-screen__ingredients">
        Молоко нормализованное, закваска молочнокислых микроорганизмов, фермент, соль пищевая...
      </div>
      <div className="lp-feat-screen__section-label">КБЖУ на 100 г</div>
      <div className="lp-feat-screen__nutrition">
        <div>
          <strong>356</strong>
          <span>ккал</span>
        </div>
        <div>
          <strong>24г</strong>
          <span>белки</span>
        </div>
        <div>
          <strong>28г</strong>
          <span>жиры</span>
        </div>
        <div>
          <strong>0г</strong>
          <span>углев.</span>
        </div>
      </div>
    </FeatScreenShell>
  )
}

function MockupAlternatives() {
  return (
    <FeatScreenShell>
      <div className="lp-feat-screen__verdict lp-feat-screen__verdict--bad">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle
            cx="7"
            cy="7"
            r="6"
            fill="rgba(248,113,113,0.18)"
            stroke="rgba(248,113,113,0.5)"
          />
          <path
            d="M4.5 4.5 9.5 9.5M9.5 4.5 4.5 9.5"
            stroke="#f87171"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <span>Не подходит — глютен</span>
      </div>
      <div className="lp-feat-screen__section-label">Похожие товары без глютена</div>
      <div className="lp-feat-screen__alt-list">
        <div className="lp-feat-screen__alt-row">
          <span className="lp-feat-screen__emoji" aria-hidden="true">
            🌾
          </span>
          <div>
            <div className="lp-feat-screen__pname">Хлеб безглютеновый</div>
            <div className="lp-feat-screen__pmeta">350 г</div>
          </div>
          <span className="c-ok lp-feat-screen__alt-badge">✓</span>
        </div>
        <div className="lp-feat-screen__alt-row">
          <span className="lp-feat-screen__emoji" aria-hidden="true">
            🌽
          </span>
          <div>
            <div className="lp-feat-screen__pname">Хлебцы кукурузные</div>
            <div className="lp-feat-screen__pmeta">100 г</div>
          </div>
          <span className="c-ok lp-feat-screen__alt-badge">✓</span>
        </div>
      </div>
    </FeatScreenShell>
  )
}

function MockupCompare() {
  return (
    <FeatScreenShell>
      <div className="lp-feat-screen__compare-head">
        <div className="lp-feat-screen__compare-col">
          <span className="lp-feat-screen__emoji" aria-hidden="true">
            🥛
          </span>
          <div className="lp-feat-screen__pname">Молоко 2.5%</div>
        </div>
        <div className="lp-feat-screen__compare-vs" aria-hidden="true">
          vs
        </div>
        <div className="lp-feat-screen__compare-col">
          <span className="lp-feat-screen__emoji" aria-hidden="true">
            🥛
          </span>
          <div className="lp-feat-screen__pname">Молоко 1.5%</div>
        </div>
      </div>
      <div className="lp-feat-screen__compare-rows">
        <div className="lp-feat-screen__compare-row">
          <span className="c-cyan">102 ккал</span>
          <span className="lp-feat-screen__compare-label">КБЖУ</span>
          <span className="c-cyan">61 ккал</span>
        </div>
        <div className="lp-feat-screen__compare-row">
          <span>3.5г</span>
          <span className="lp-feat-screen__compare-label">Жиры</span>
          <span>1.5г</span>
        </div>
        <div className="lp-feat-screen__compare-row">
          <span className="c-ok">✓ Подходит</span>
          <span className="lp-feat-screen__compare-label">Вердикт</span>
          <span className="c-ok">✓ Подходит</span>
        </div>
      </div>
    </FeatScreenShell>
  )
}

function MockupAI() {
  return (
    <FeatScreenShell>
      <div className="lp-feat-screen__chat">
        <div className="lp-feat-screen__bubble lp-feat-screen__bubble--user">
          Есть ли в этом товаре глютен?
        </div>
        <div className="lp-feat-screen__bubble lp-feat-screen__bubble--ai">
          <div className="lp-feat-screen__ai-badge" aria-hidden="true">
            AI
          </div>
          В составе нет глютена. Этот кефир безопасен для вас по вашему профилю.
        </div>
        <div className="lp-feat-screen__bubble lp-feat-screen__bubble--user">
          Посоветуй замену пожирнее
        </div>
        <div className="lp-feat-screen__bubble lp-feat-screen__bubble--ai">
          <div className="lp-feat-screen__ai-badge" aria-hidden="true">
            AI
          </div>
          Рекомендую Кефир 3.2% — тот же бренд, без аллергенов.
        </div>
      </div>
      <div className="lp-feat-screen__chat-input" aria-hidden="true">
        <span>Спроси что угодно...</span>
      </div>
    </FeatScreenShell>
  )
}

function MockupNoInstall() {
  return (
    <FeatScreenShell>
      <div className="lp-feat-screen__qr-wrap">
        <div className="lp-feat-screen__qr-icon" aria-hidden="true">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <rect
              x="4"
              y="4"
              width="20"
              height="20"
              rx="3"
              stroke="var(--lp-brand-glow)"
              strokeWidth="2"
            />
            <rect x="8" y="8" width="12" height="12" rx="1" fill="var(--lp-brand-soft)" />
            <rect
              x="32"
              y="4"
              width="20"
              height="20"
              rx="3"
              stroke="var(--lp-brand-glow)"
              strokeWidth="2"
            />
            <rect x="36" y="8" width="12" height="12" rx="1" fill="var(--lp-brand-soft)" />
            <rect
              x="4"
              y="32"
              width="20"
              height="20"
              rx="3"
              stroke="var(--lp-brand-glow)"
              strokeWidth="2"
            />
            <rect x="8" y="36" width="12" height="12" rx="1" fill="var(--lp-brand-soft)" />
            <rect x="32" y="32" width="6" height="6" rx="1" fill="var(--lp-brand-glow)" />
            <rect x="42" y="32" width="6" height="6" rx="1" fill="var(--lp-brand-glow)" />
            <rect x="32" y="42" width="6" height="6" rx="1" fill="var(--lp-brand-glow)" />
            <rect x="42" y="42" width="6" height="6" rx="1" fill="var(--lp-brand-glow)" />
          </svg>
        </div>
        <div className="lp-feat-screen__qr-label">Наведи камеру на QR</div>
        <div className="lp-feat-screen__url-bar">
          <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true">
            <path
              d="M5 1a3 3 0 0 1 3 3c0 2.5-3 7-3 7S2 6.5 2 4a3 3 0 0 1 3-3z"
              stroke="var(--lp-ok)"
              strokeWidth="1.2"
            />
            <circle cx="5" cy="4" r="1.2" fill="var(--lp-ok)" />
          </svg>
          <span>korset.app/s/mars</span>
        </div>
        <div className="lp-feat-screen__qr-badge">Открывается за 1 сек</div>
      </div>
    </FeatScreenShell>
  )
}

function FeatureMockup({ index, phone, fit }) {
  switch (index) {
    case 0:
      return <MockupFitCheck phone={phone} fit={fit} />
    case 1:
      return <MockupKbju />
    case 2:
      return <MockupAlternatives />
    case 3:
      return <MockupCompare />
    case 4:
      return <MockupAI />
    default:
      return <MockupNoInstall />
  }
}

function RetailIcon({ name }) {
  const icons = {
    qr_code_2: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="4" y="4" width="4" height="4" fill="currentColor" opacity=".7" />
        <rect x="14" y="2" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="16" y="4" width="4" height="4" fill="currentColor" opacity=".7" />
        <rect x="2" y="14" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="4" y="16" width="4" height="4" fill="currentColor" opacity=".7" />
        <rect x="14" y="14" width="3" height="3" fill="currentColor" opacity=".7" />
        <rect x="19" y="14" width="3" height="3" fill="currentColor" opacity=".7" />
        <rect x="14" y="19" width="3" height="3" fill="currentColor" opacity=".7" />
        <rect x="19" y="19" width="3" height="3" fill="currentColor" opacity=".7" />
      </svg>
    ),
    inventory_2: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3 3 7v10l9 4 9-4V7L12 3z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M3 7l9 4 9-4M12 11v10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    query_stats: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="13" width="4" height="8" rx="1" fill="currentColor" opacity=".5" />
        <rect x="10" y="8" width="4" height="13" rx="1" fill="currentColor" opacity=".75" />
        <rect x="17" y="3" width="4" height="18" rx="1" fill="currentColor" />
        <path
          d="M3 6l5 4 5-3 6-3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    dashboard: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="13" y="2" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="13" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect
          x="13"
          y="13"
          width="9"
          height="9"
          rx="2"
          fill="currentColor"
          opacity=".25"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
    campaign: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 9h2l5 4V5L5 9H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M6 14l2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M10 9c2 0 6-2 8-6v14c-2-4-6-6-8-6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  }
  return icons[name] ?? null
}

function DemoPhone({ texts }) {
  return (
    <figure className="lp-phone-wrap" aria-label={texts.aria}>
      <div className="lp-phone">
        {/* Notch */}
        <div className="lp-phone__notch" aria-hidden="true" />

        {/* Screen */}
        <div className="lp-phone__screen">
          {/* Status bar */}
          <div className="lp-phone__bar" aria-hidden="true">
            <span>9:41</span>
            <span className="lp-phone__bar-icons">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="currentColor">
                <rect x="0" y="2" width="2" height="6" rx="1" opacity="0.4" />
                <rect x="3" y="1.5" width="2" height="6.5" rx="1" opacity="0.6" />
                <rect x="6" y="1" width="2" height="7" rx="1" opacity="0.8" />
                <rect x="9" y="0" width="2" height="8" rx="1" />
              </svg>
              <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
                <rect
                  x="0.5"
                  y="0.5"
                  width="11"
                  height="7"
                  rx="2"
                  stroke="currentColor"
                  strokeOpacity="0.4"
                />
                <rect
                  x="11.5"
                  y="2.5"
                  width="2"
                  height="3"
                  rx="1"
                  fill="currentColor"
                  fillOpacity="0.4"
                />
                <rect x="1.5" y="1.5" width="8" height="5" rx="1.5" fill="currentColor" />
              </svg>
            </span>
          </div>

          {/* App header */}
          <div className="lp-phone__appbar">
            <div className="lp-phone__appbar-logo">
              <img src="/icon_logo.svg" alt="" width="16" height="16" />
            </div>
            <span>Körset</span>
            <div className="lp-phone__appbar-scan" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M2 6V4a2 2 0 0 1 2-2h2M12 2h2a2 2 0 0 1 2 2v2M16 12v2a2 2 0 0 1-2 2h-2M6 16H4a2 2 0 0 1-2-2v-2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path d="M3 9h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Product card */}
          <div className="lp-phone__product">
            <div className="lp-phone__product-img" aria-hidden="true">
              🥛
            </div>
            <div className="lp-phone__product-info">
              <div className="lp-phone__product-name">{texts.productName}</div>
              <div className="lp-phone__product-meta">{texts.productMeta}</div>
            </div>
          </div>

          {/* Status badge */}
          <div className="lp-phone__status">
            <CheckIcon />
            <span>{texts.status}</span>
          </div>

          {/* Rows */}
          <div className="lp-phone__rows">
            <div className="lp-phone__row">
              <span className="lp-phone__row-label">{texts.allergen}</span>
              <span className="lp-phone__row-ok">
                <CheckIcon />
                {texts.allergenOk}
              </span>
            </div>
            <div className="lp-phone__row">
              <span className="lp-phone__row-label">{texts.halal}</span>
              <span className="lp-phone__row-ok">
                <CheckIcon />
                {texts.halalOk}
              </span>
            </div>
            <div className="lp-phone__row lp-phone__row--kbju">
              <span className="lp-phone__row-label">КБЖУ</span>
              <span className="lp-phone__row-kbju">{texts.kbju}</span>
            </div>
          </div>

          {/* Scan beam animation */}
          <div className="lp-phone__scanbeam" aria-hidden="true" />
        </div>

        {/* Home indicator */}
        <div className="lp-phone__home" aria-hidden="true" />
      </div>

      {/* Atmospheric glow */}
      <div className="lp-phone__glow" aria-hidden="true" />

      {/* Floating orbit chips */}
      <div className="lp-phone__orbit lp-phone__orbit--top">
        <span className="lp-phone__orbit-dot" aria-hidden="true" />
        {texts.orbitTop}
      </div>
      <div className="lp-phone__orbit lp-phone__orbit--bottom">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M6 1v5l3 2"
            stroke="var(--lp-cyan)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="6" cy="6" r="5" stroke="var(--lp-cyan)" strokeWidth="1.2" opacity="0.5" />
        </svg>
        {texts.orbitBottom}
      </div>
    </figure>
  )
}

function HeroRotatingWord({ words }) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState('in')

  useEffect(() => {
    if (!words.length) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const id = setInterval(() => {
      setPhase('out')
      setTimeout(() => {
        setIndex((i) => (i + 1) % words.length)
        setPhase('in')
      }, 380)
    }, 2600)
    return () => clearInterval(id)
  }, [words.length])

  if (!words.length) return null

  // Find the longest word to reserve space
  const longestWord = [...words].sort((a, b) => b.length - a.length)[0]

  return (
    <span className={`lp-rotating lp-rotating--${phase}`} aria-live="polite">
      {/* Invisible placeholder word to keep container width stable */}
      <span className="lp-rotating__placeholder" aria-hidden="true">
        {longestWord}
      </span>
      {/* Actual animated word */}
      <span className="lp-rotating__word">{words[index]}</span>
    </span>
  )
}

export default function LandingScreen() {
  const { t, exists } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeFeatureTab, setActiveFeatureTab] = useState(0)
  const videoRef = useRef(null)
  const rootRef = useRef(null)

  useReveal(rootRef)

  useEffect(() => {
    document.documentElement.classList.add('lp-html-active')
    document.body.classList.add('lp-html-active-body')
    return () => {
      document.documentElement.classList.remove('lp-html-active')
      document.body.classList.remove('lp-html-active-body')
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const [activeFaq, setActiveFaq] = useState(null)

  const d = useMemo(
    () => ({
      nav: {
        how: t('landing.nav.how'),
        features: t('landing.nav.features'),
        retail: t('landing.nav.retail'),
        pricing: t('landing.nav.pricing'),
      },
      hero: {
        chipsLabel: t('landing.hero.chipsLabel'),
        chips: collectStrArr(t, exists, 'landing.hero.chips'),
        titlePrefix: t('landing.hero.titlePrefix'),
        rotating: collectStrArr(t, exists, 'landing.hero.rotating'),
        subtitle: t('landing.hero.subtitle'),
        primary: t('landing.hero.primary'),
        secondary: t('landing.hero.secondary'),
        tagline: exists('landing.hero.tagline') ? t('landing.hero.tagline') : '',
      },
      heroVideo: {
        poster:
          'https://images.unsplash.com/photo-1567449303183-ae0d6ed1498f?auto=format&fit=crop&w=1920&q=70',
        posterAlt: exists('landing.heroVideo.posterAlt') ? t('landing.heroVideo.posterAlt') : '',
        caption: exists('landing.heroVideo.caption') ? t('landing.heroVideo.caption') : '',
        play: exists('landing.heroVideo.play') ? t('landing.heroVideo.play') : '',
      },
      demo: {
        badge: t('landing.demo.badge'),
        title: t('landing.demo.title'),
        desc: t('landing.demo.desc'),
        cta: t('landing.demo.cta'),
        points: collectStrArr(t, exists, 'landing.demo.points'),
        phone: {
          aria: t('landing.demo.aria'),
          productName: t('landing.demo.productName'),
          productMeta: t('landing.demo.productMeta'),
          status: t('landing.demo.status'),
          allergen: t('landing.demo.allergen'),
          allergenOk: t('landing.demo.allergenOk'),
          halal: t('landing.demo.halal'),
          halalOk: t('landing.demo.halalOk'),
          kbju: t('landing.demo.kbju'),
          orbitTop: t('landing.demo.orbitTop'),
          orbitBottom: t('landing.demo.orbitBottom'),
        },
      },
      how: {
        eyebrow: t('landing.how.eyebrow'),
        title: t('landing.how.title'),
        text: t('landing.how.text'),
        steps: collectObjArr(t, exists, 'landing.how.steps', ['icon', 'title', 'text']),
      },
      fit: {
        eyebrow: t('landing.fit.eyebrow'),
        title: t('landing.fit.title'),
        text: t('landing.fit.text'),
        cards: collectObjArr(t, exists, 'landing.fit.cards', ['tone', 'icon', 'title', 'text']),
        disclaimer: t('landing.fit.disclaimer'),
        alternatives: t('landing.fit.alternatives'),
      },
      audience: {
        eyebrow: t('landing.audience.eyebrow'),
        title: t('landing.audience.title'),
        text: t('landing.audience.text'),
        cards: collectObjArr(t, exists, 'landing.audience.cards', ['icon', 'title', 'text']),
      },
      features: {
        eyebrow: t('landing.features.eyebrow'),
        title: t('landing.features.title'),
        text: t('landing.features.text'),
        cards: collectObjArr(t, exists, 'landing.features.cards', [
          'icon',
          'title',
          'text',
          'group',
        ]),
      },
      stats: collectObjArr(t, exists, 'landing.stats', ['value', 'label']),
      video: {
        title: exists('landing.video.title') ? t('landing.video.title') : '',
        play: exists('landing.video.play') ? t('landing.video.play') : '',
      },
      retail: {
        eyebrow: t('landing.retail.eyebrow'),
        title: t('landing.retail.title'),
        text: t('landing.retail.text'),
        cta: t('landing.retail.cta'),
        cards: collectObjArr(t, exists, 'landing.retail.cards', ['icon', 'title', 'text']),
      },
      pricing: {
        eyebrow: t('landing.pricing.eyebrow'),
        title: t('landing.pricing.title'),
        text: t('landing.pricing.text'),
        plans: ['basic', 'pro', 'enterprise'].map((plan) => ({
          id: plan,
          badge: exists(`landing.pricing.${plan}.badge`)
            ? t(`landing.pricing.${plan}.badge`)
            : null,
          title: t(`landing.pricing.${plan}.title`),
          price: exists(`landing.pricing.${plan}.price`)
            ? t(`landing.pricing.${plan}.price`)
            : null,
          features: collectStrArr(t, exists, `landing.pricing.${plan}.feat`),
          note: exists(`landing.pricing.${plan}.note`) ? t(`landing.pricing.${plan}.note`) : null,
          cta: t(`landing.pricing.${plan}.cta`),
        })),
      },
      faq: {
        eyebrow: t('landing.faq.eyebrow'),
        title: t('landing.faq.title'),
        items: collectObjArr(t, exists, 'landing.faq.items', ['q', 'a']),
      },
      cta: {
        title: exists('landing.cta.title') ? t('landing.cta.title') : '',
        text: exists('landing.cta.text') ? t('landing.cta.text') : '',
        primary: exists('landing.cta.primary') ? t('landing.cta.primary') : '',
        secondary: exists('landing.cta.secondary') ? t('landing.cta.secondary') : '',
      },
      footer: {
        title: t('landing.footer.title'),
        text: t('landing.footer.text'),
        made: t('landing.footer.made'),
        copyright: t('landing.footer.copyright'),
        groups: [0, 1].map((g) => ({
          title: t(`landing.footer.groups.${g}.title`),
          links: collectObjArr(t, exists, `landing.footer.groups.${g}.links`, ['label', 'href']),
        })),
      },
    }),
    [t, exists]
  )

  return (
    <main className="lp-page" ref={rootRef}>
      <div className="lp-bg-grain" aria-hidden="true" />

      <header className={`lp-header ${scrolled ? 'lp-header--scrolled' : ''}`}>
        <div className="lp-header__inner">
          <a className="lp-brand" href="/" aria-label="Körset">
            <img src="/korset_logo.svg" alt="Körset" className="lp-brand__logo" />
          </a>

          <nav className="lp-header__nav" aria-label="Primary">
            <a href="#how">{d.nav.how}</a>
            <a href="#features">{d.nav.features}</a>
            <a href="#retail">{d.nav.retail}</a>
            <a href="#pricing">{d.nav.pricing}</a>
          </nav>

          <div className="lp-header__actions">
            <a className="lp-btn lp-btn--primary lp-btn--sm" href="/stores">
              <span>{d.hero.primary}</span>
              <ArrowIcon />
            </a>
            <button
              type="button"
              className={`lp-burger ${menuOpen ? 'lp-burger--open' : ''}`}
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <div className={`lp-mobile-menu ${menuOpen ? 'lp-mobile-menu--open' : ''}`}>
        <nav>
          <a href="#how" onClick={() => setMenuOpen(false)}>
            {d.nav.how}
          </a>
          <a href="#features" onClick={() => setMenuOpen(false)}>
            {d.nav.features}
          </a>
          <a href="#retail" onClick={() => setMenuOpen(false)}>
            {d.nav.retail}
          </a>
          <a href="#pricing" onClick={() => setMenuOpen(false)}>
            {d.nav.pricing}
          </a>
          <a className="lp-btn lp-btn--primary" href="/stores" onClick={() => setMenuOpen(false)}>
            {d.hero.primary}
            <ArrowIcon />
          </a>
        </nav>
      </div>

      <section className="lp-hero" data-testid="landing-consumer">
        {/* Full-screen background video */}
        <div className="lp-hero__bg" aria-hidden="true">
          <video
            key="hero-video-local"
            className="lp-hero__bg-img"
            autoPlay
            muted
            loop
            playsInline
            poster="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1920&q=80"
            src="/here_video.mp4"
            style={{
              opacity: 1,
              visibility: 'visible',
              display: 'block',
              filter: 'none',
              objectFit: 'cover',
            }}
          />
          <div className="lp-hero__bg-overlay" />
        </div>

        {/* Content overlaid on background */}
        <div className="lp-hero__wrap">
          <div className="lp-hero__copy">
            <ul className="lp-pills" aria-label={d.hero.chipsLabel}>
              {d.hero.chips.map((chip, i) => (
                <li
                  key={chip}
                  className={`lp-pills__item lp-reveal lp-reveal--scale lp-reveal--delay-${i + 1}`}
                >
                  <span className="lp-pills__dot" aria-hidden="true" />
                  {chip}
                </li>
              ))}
            </ul>

            <h1 className="lp-hero__title lp-reveal">
              {d.hero.titlePrefix}{' '}
              <span className="lp-hero__title-accent">
                <HeroRotatingWord words={d.hero.rotating} />
              </span>
            </h1>

            <p className="lp-hero__subtitle lp-reveal lp-reveal--delay-1">{d.hero.subtitle}</p>

            <div className="lp-hero__actions lp-reveal lp-reveal--delay-2">
              <a className="lp-btn lp-btn--primary lp-btn--lg" href="/stores">
                <span>{d.hero.primary}</span>
                <ArrowIcon />
              </a>
              <a className="lp-btn lp-btn--ghost lp-btn--lg" href="#demo">
                <PlayIcon />
                <span>{d.hero.secondary}</span>
              </a>
            </div>

            {d.hero.tagline && (
              <div className="lp-hero__tagline lp-reveal lp-reveal--delay-3">
                {d.hero.tagline.split('·').map((part) => (
                  <span key={part}>
                    <CheckMicroIcon />
                    {part.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lp-hero__scroll-cue" aria-hidden="true">
          <span />
        </div>
      </section>

      {/* ═══ ЭТАП 2 — Demo ═══ */}
      <section className="lp-section lp-demo" id="demo">
        <div className="lp-demo__inner">
          {/* Left: copy */}
          <div className="lp-demo__copy">
            <span className="lp-section-badge lp-reveal">{d.demo.badge}</span>

            <h2 className="lp-section-title lp-reveal lp-reveal--delay-1">{d.demo.title}</h2>

            <p className="lp-section-desc lp-reveal lp-reveal--delay-2">{d.demo.desc}</p>

            <ul className="lp-demo__points lp-reveal lp-reveal--delay-3">
              {d.demo.points.map((point) => (
                <li key={point}>
                  <CheckMicroIcon />
                  {point}
                </li>
              ))}
            </ul>

            <div className="lp-demo__actions lp-reveal lp-reveal--delay-4">
              <a className="lp-btn lp-btn--primary" href="/stores">
                <span>{d.demo.cta}</span>
                <ArrowIcon />
              </a>
            </div>
          </div>

          {/* Right: CSS phone mockup */}
          <div className="lp-demo__device lp-reveal lp-reveal--scale lp-reveal--delay-2">
            <DemoPhone texts={d.demo.phone} />
          </div>
        </div>
      </section>

      {/* ═══ ЭТАП 3а — How (3 шага) ═══ */}
      <section className="lp-section lp-how" id="how" aria-labelledby="lp-how-title">
        <div className="lp-how__inner">
          {/* Section header */}
          <div className="lp-how__header lp-reveal">
            <span className="lp-section-badge">{d.how.eyebrow}</span>
            <h2 className="lp-section-title" id="lp-how-title">
              {d.how.title}
            </h2>
            <p className="lp-section-desc">{d.how.text}</p>
          </div>

          {/* Steps */}
          <ol className="lp-how__steps" role="list">
            {/* Step 01 — Photo left, copy right */}
            <li className="lp-how__step lp-how__step--photo-left">
              <div className="lp-how__step-media lp-reveal lp-reveal--right">
                <figure className="lp-how__img-wrap">
                  <img
                    src="https://images.unsplash.com/photo-1534723452862-4c874986ebca?auto=format&fit=crop&w=900&q=75"
                    alt=""
                    className="lp-how__img"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="lp-how__img-overlay" aria-hidden="true" />
                </figure>
              </div>
              <div className="lp-how__step-copy lp-reveal lp-reveal--left lp-reveal--delay-1">
                <span className="lp-how__step-num" aria-hidden="true">
                  01
                </span>
                <h3 className="lp-how__step-title">{d.how.steps[0]?.title}</h3>
                <p className="lp-how__step-text">{d.how.steps[0]?.text}</p>
              </div>
            </li>

            {/* Step 02 — Copy left, photo right */}
            <li className="lp-how__step lp-how__step--photo-right">
              <div className="lp-how__step-copy lp-reveal lp-reveal--right lp-reveal--delay-1">
                <span className="lp-how__step-num" aria-hidden="true">
                  02
                </span>
                <h3 className="lp-how__step-title">{d.how.steps[1]?.title}</h3>
                <p className="lp-how__step-text">{d.how.steps[1]?.text}</p>
              </div>
              <div className="lp-how__step-media lp-reveal lp-reveal--left">
                <figure className="lp-how__img-wrap">
                  <img
                    src="https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&w=900&q=75"
                    alt=""
                    className="lp-how__img"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="lp-how__img-overlay" aria-hidden="true" />
                </figure>
              </div>
            </li>

            {/* Step 03 — Mini FitCheck mockup left, copy right */}
            <li className="lp-how__step lp-how__step--photo-left">
              <div className="lp-how__step-media lp-reveal lp-reveal--right">
                <div className="lp-how__result-mockup" aria-hidden="true">
                  <div className="lp-how__result-header">
                    <div className="lp-how__result-logo">
                      <img src="/icon_logo.svg" alt="" width="14" height="14" />
                    </div>
                    <span>Körset</span>
                  </div>
                  <div className="lp-how__result-card lp-how__result-card--good">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle
                        cx="10"
                        cy="10"
                        r="9"
                        fill="rgba(52,211,153,0.18)"
                        stroke="rgba(52,211,153,0.5)"
                      />
                      <path
                        d="M6 10.4 8.4 12.8 14 7.2"
                        stroke="#34d399"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div>
                      <div className="lp-how__result-verdict">{d.fit.cards[0]?.title}</div>
                      <div className="lp-how__result-sub">{d.how.steps[2]?.text}</div>
                    </div>
                  </div>
                  <div className="lp-how__result-rows">
                    <div className="lp-how__result-row">
                      <span>{d.demo.phone.allergen}</span>
                      <span className="lp-how__result-row-ok">{d.demo.phone.allergenOk}</span>
                    </div>
                    <div className="lp-how__result-row">
                      <span>{d.demo.phone.halal}</span>
                      <span className="lp-how__result-row-ok">{d.demo.phone.halalOk}</span>
                    </div>
                    <div className="lp-how__result-row">
                      <span>КБЖУ</span>
                      <span className="lp-how__result-row-kbju">{d.demo.phone.kbju}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lp-how__step-copy lp-reveal lp-reveal--left lp-reveal--delay-1">
                <span className="lp-how__step-num" aria-hidden="true">
                  03
                </span>
                <h3 className="lp-how__step-title">{d.how.steps[2]?.title}</h3>
                <p className="lp-how__step-text">{d.how.steps[2]?.text}</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* ═══ ЭТАП 3б — Fit-Check (3 карточки) ═══ */}
      <section className="lp-section lp-fit" id="fit" aria-labelledby="lp-fit-title">
        {/* Background photo */}
        <div className="lp-fit__bg" aria-hidden="true">
          <img
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=60"
            alt=""
            className="lp-fit__bg-img"
            loading="lazy"
            decoding="async"
          />
          <div className="lp-fit__bg-overlay" />
        </div>

        <div className="lp-fit__inner">
          {/* Header */}
          <div className="lp-fit__header lp-reveal">
            <span className="lp-section-badge">{d.fit.eyebrow}</span>
            <h2 className="lp-section-title" id="lp-fit-title">
              {d.fit.title}
            </h2>
            <p className="lp-section-desc">{d.fit.text}</p>
          </div>

          {/* 3 Result cards */}
          <div className="lp-fit__cards">
            {d.fit.cards.map((card, i) => (
              <article
                key={card.tone}
                className={`lp-fit__card lp-fit__card--${card.tone} lp-reveal lp-reveal--delay-${i + 1}`}
              >
                <div className="lp-fit__card-accent" aria-hidden="true" />
                <header className="lp-fit__card-head">
                  <FitIcon tone={card.tone} />
                  <span className={`lp-fit__card-title lp-fit__card-title--${card.tone}`}>
                    {card.title}
                  </span>
                </header>
                <p className="lp-fit__card-text">{card.text}</p>
                <FitExampleProduct tone={card.tone} />
              </article>
            ))}
          </div>

          {/* Alternatives note */}
          <div className="lp-fit__footer lp-reveal lp-reveal--delay-4">
            <p className="lp-fit__alternatives">
              <AlternativesIcon />
              {d.fit.alternatives}
            </p>
            <p className="lp-fit__disclaimer">{d.fit.disclaimer}</p>
          </div>
        </div>
      </section>

      {/* ═══ ЭТАП 4а — Audience */}
      <section className="lp-section lp-audience" id="audience" aria-labelledby="lp-audience-title">
        <div className="lp-audience__inner">
          <div className="lp-audience__header lp-reveal">
            <span className="lp-section-badge">{d.audience.eyebrow}</span>
            <h2 className="lp-section-title" id="lp-audience-title">
              {d.audience.title}
            </h2>
            <p className="lp-section-desc">{d.audience.text}</p>
          </div>
          <div className="lp-audience__grid">
            {d.audience.cards.map((card, i) => (
              <article key={i} className={`lp-audience__card lp-reveal lp-reveal--delay-${i + 1}`}>
                <div className="lp-audience__card-photo">
                  <img
                    src={AUDIENCE_PHOTOS[i]}
                    alt=""
                    className="lp-audience__card-img"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="lp-audience__card-overlay" aria-hidden="true" />
                </div>
                <div className="lp-audience__card-body">
                  <h3 className="lp-audience__card-title">{card.title}</h3>
                  <p className="lp-audience__card-text">{card.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ЭТАП 4б — Features */}
      <section className="lp-section lp-features" id="features" aria-labelledby="lp-features-title">
        <div className="lp-features__inner">
          <div className="lp-features__header lp-reveal">
            <span className="lp-section-badge">{d.features.eyebrow}</span>
            <h2 className="lp-section-title" id="lp-features-title">
              {d.features.title}
            </h2>
            <p className="lp-section-desc">{d.features.text}</p>
          </div>

          <div
            className="lp-features__tabs lp-reveal lp-reveal--delay-1"
            role="tablist"
            aria-label={d.features.title}
          >
            {d.features.cards.map((card, i) => (
              <button
                key={i}
                id={`lp-ftab-${i}`}
                role="tab"
                aria-selected={activeFeatureTab === i}
                aria-controls={`lp-fpane-${i}`}
                className={`lp-features__tab${activeFeatureTab === i ? ' lp-features__tab--active' : ''}`}
                onClick={() => setActiveFeatureTab(i)}
              >
                {card.title}
              </button>
            ))}
          </div>

          {d.features.cards.map((card, i) => (
            <div
              key={i}
              id={`lp-fpane-${i}`}
              role="tabpanel"
              aria-labelledby={`lp-ftab-${i}`}
              hidden={activeFeatureTab !== i}
              className="lp-features__pane"
            >
              <div className="lp-features__pane-grid">
                <div className="lp-features__pane-copy">
                  <span className="lp-features__pane-group">{card.group}</span>
                  <h3 className="lp-features__pane-title">{card.title}</h3>
                  <p className="lp-features__pane-text">{card.text}</p>
                </div>
                <div className="lp-features__pane-media">
                  <FeatureMockup index={i} phone={d.demo.phone} fit={d.fit} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ ЭТАП 5а — Stats ═══ */}
      <section className="lp-stats" id="stats" aria-label="Körset — статистика">
        <div className="lp-stats__bg" aria-hidden="true">
          <img
            src="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=1800&q=55"
            alt=""
            className="lp-stats__bg-img"
            loading="lazy"
            decoding="async"
          />
          <div className="lp-stats__bg-overlay" />
        </div>
        <div className="lp-stats__inner">
          <div className="lp-stats__grid">
            {d.stats.map((stat, i) => (
              <div key={i} className={`lp-stats__item lp-reveal lp-reveal--delay-${i + 1}`}>
                <span className="lp-stats__value">{stat.value}</span>
                <span className="lp-stats__label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ЭТАП 5б — Video ═══ */}
      <section className="lp-section lp-video" id="demo-video" aria-labelledby="lp-video-title">
        <div className="lp-video__inner">
          <div className="lp-video__header lp-reveal">
            <h2 className="lp-section-title" id="lp-video-title">
              {d.video.title}
            </h2>
          </div>
          <div className="lp-video__player lp-reveal lp-reveal--delay-1">
            <figure className="lp-video__thumb">
              <img
                src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1400&q=70"
                alt=""
                className="lp-video__thumb-img"
                loading="lazy"
                decoding="async"
              />
              <div className="lp-video__thumb-overlay" aria-hidden="true" />
              <button className="lp-video__play-btn" aria-label={d.video.play}>
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                  <path d="M9 7l13 6.5L9 20V7z" fill="currentColor" />
                </svg>
              </button>
              <div className="lp-video__caption" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                  <path
                    d="M7 4v3l2 1.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                60 сек
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* ═══ ЭТАП 5в — Retail ═══ */}
      <section className="lp-section lp-retail" id="retail" aria-labelledby="lp-retail-title">
        <div className="lp-retail__inner">
          <div className="lp-retail__header lp-reveal">
            <span className="lp-section-badge">{d.retail.eyebrow}</span>
            <h2 className="lp-section-title" id="lp-retail-title">
              {d.retail.title}
            </h2>
            <p className="lp-section-desc">{d.retail.text}</p>
          </div>
          <div className="lp-retail__cards">
            {d.retail.cards.map((card, i) => (
              <article
                key={i}
                className={`lp-retail__card lp-reveal lp-reveal--delay-${(i % 3) + 1}`}
              >
                <div className="lp-retail__card-icon">
                  <RetailIcon name={card.icon} />
                </div>
                <div>
                  <h3 className="lp-retail__card-title">{card.title}</h3>
                  <p className="lp-retail__card-text">{card.text}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="lp-retail__cta lp-reveal lp-reveal--delay-2">
            <a href="/retail" className="lp-btn lp-btn--primary lp-btn--lg">
              {d.retail.cta}
              <ArrowIcon />
            </a>
          </div>
        </div>
      </section>

      {/* ═══ ЭТАП 6а — Pricing ═══ */}
      <section className="lp-section lp-pricing" id="pricing" aria-labelledby="lp-pricing-title">
        <div className="lp-pricing__bg-glow" aria-hidden="true" />
        <div className="lp-pricing__inner">
          <div className="lp-pricing__header lp-reveal">
            <span className="lp-section-badge">{d.pricing.eyebrow}</span>
            <h2 className="lp-section-title" id="lp-pricing-title">
              {d.pricing.title}
            </h2>
            <p className="lp-section-desc">{d.pricing.text}</p>
          </div>
          <div className="lp-pricing__grid">
            {d.pricing.plans.map((plan, i) => (
              <article
                key={plan.id}
                className={`lp-pricing__card lp-pricing__card--${plan.id} lp-reveal lp-reveal--delay-${i + 1}`}
              >
                {plan.badge && <div className="lp-pricing__badge">{plan.badge}</div>}
                <div className="lp-pricing__card-head">
                  <h3 className="lp-pricing__card-title">{plan.title}</h3>
                  {plan.price && <div className="lp-pricing__card-price">{plan.price}</div>}
                </div>
                <ul className="lp-pricing__card-feats">
                  {plan.features.map((feat, j) => (
                    <li key={j}>
                      <CheckMicroIcon />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <div className="lp-pricing__card-foot">
                  {plan.note && <div className="lp-pricing__card-note">{plan.note}</div>}
                  <a
                    href="/retail"
                    className={`lp-btn lp-btn--full ${plan.id === 'pro' ? 'lp-btn--primary' : 'lp-btn--ghost'}`}
                  >
                    {plan.cta}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ЭТАП 6б — FAQ ═══ */}
      <section className="lp-section lp-faq" id="faq" aria-labelledby="lp-faq-title">
        <div className="lp-faq__inner">
          <div className="lp-faq__layout">
            <div className="lp-faq__sidebar lp-reveal">
              <span className="lp-section-badge">{d.faq.eyebrow}</span>
              <h2 className="lp-section-title" id="lp-faq-title">
                {d.faq.title}
              </h2>
              <p className="lp-faq__sidebar-text">
                Остались вопросы? Напишите нам в Telegram, и мы поможем.
              </p>
              <a
                href="https://t.me/korset_app"
                target="_blank"
                rel="noreferrer"
                className="lp-btn lp-btn--ghost"
              >
                Написать в поддержку
              </a>
            </div>
            <div className="lp-faq__list lp-reveal lp-reveal--delay-1">
              {d.faq.items.map((item, i) => {
                const isOpen = activeFaq === i
                return (
                  <div key={i} className={`lp-faq__item ${isOpen ? 'lp-faq__item--active' : ''}`}>
                    <button
                      className="lp-faq__question"
                      aria-expanded={isOpen}
                      onClick={() => setActiveFaq(isOpen ? null : i)}
                    >
                      <span>{item.q}</span>
                      <ChevronIcon className="lp-faq__chevron" />
                    </button>
                    <div className="lp-faq__answer" aria-hidden={!isOpen}>
                      <div className="lp-faq__answer-inner">{item.a}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ЭТАП 7а — Финальный CTA ═══ */}
      <section className="lp-section lp-cta" aria-labelledby="lp-cta-title">
        <div className="lp-cta__inner lp-reveal">
          <div className="lp-cta__content">
            <h2 className="lp-section-title lp-cta__title" id="lp-cta-title">
              {d.cta.title}
            </h2>
            <p className="lp-cta__text">{d.cta.text}</p>
            <div className="lp-cta__actions">
              <a href="/retail" className="lp-btn lp-btn--primary lp-btn--lg">
                {d.cta.primary}
              </a>
              <a href="#demo-video" className="lp-btn lp-btn--ghost lp-btn--lg">
                <PlayIcon />
                {d.cta.secondary}
              </a>
            </div>
          </div>
          <div className="lp-cta__bg" aria-hidden="true">
            <div className="lp-cta__glow" />
          </div>
        </div>
      </section>

      {/* ═══ ЭТАП 7б — Footer ═══ */}
      <footer className="lp-footer" id="footer">
        <div className="lp-footer__inner">
          <div className="lp-footer__top">
            <div className="lp-footer__brand-col">
              <div className="lp-footer__brand-wrap">
                <a className="lp-brand lp-footer__brand" href="/" aria-label="Körset">
                  <img src="/korset_logo.svg" alt="Körset" className="lp-brand__logo" />
                </a>
              </div>
              <h3 className="lp-footer__title">{d.footer.title}</h3>
              <p className="lp-footer__text">{d.footer.text}</p>
            </div>
            <div className="lp-footer__links">
              {d.footer.groups.map((group, i) => (
                <div key={i} className="lp-footer__group">
                  <h4 className="lp-footer__group-title">{group.title}</h4>
                  <ul>
                    {group.links.map((link, j) => (
                      <li key={j}>
                        <a href={link.href}>{link.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="lp-footer__bottom">
            <div className="lp-footer__copy">{d.footer.copyright}</div>
            <div className="lp-footer__made">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                style={{ color: 'var(--lp-brand)', marginRight: 6, verticalAlign: 'text-bottom' }}
              >
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  fill="currentColor"
                />
              </svg>
              {d.footer.made}
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
