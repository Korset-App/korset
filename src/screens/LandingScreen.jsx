import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import './LandingScreen.css'
import { useI18n } from '../i18n/index.js'

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
    for (const f of fields) obj[f] = t(`${prefix}.${i}.${f}`)
    arr.push(obj)
    i++
  }
  return arr
}

function SectionTitle({ eyebrow, title, text }) {
  return (
    <div className="landing-section-title">
      {eyebrow && <div className="landing-eyebrow">{eyebrow}</div>}
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  )
}

function Icon({ name }) {
  return (
    <span className="material-symbols-outlined landing-icon" aria-hidden="true">
      {name}
    </span>
  )
}

function HeroRotatingWord({ words }) {
  const [index, setIndex] = useState(0)
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    if (!words.length) return
    const id = setInterval(() => {
      setTransitioning(true)
      setTimeout(() => {
        setIndex((i) => (i + 1) % words.length)
        setTransitioning(false)
      }, 400)
    }, 2500)
    return () => clearInterval(id)
  }, [words.length])

  if (!words.length) return null

  return (
    <span
      className={`landing-hero__rotating-word ${transitioning ? 'landing-hero__rotating-word--out' : 'landing-hero__rotating-word--in'}`}
    >
      {words[index]}
    </span>
  )
}

export default function LandingScreen() {
  const { t, exists } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const phoneRef = useRef(null)
  const [scrollY, setScrollY] = useState(0)

  const handleScroll = useCallback(() => {
    setScrollY(window.scrollY)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const phoneRotateY = useMemo(() => {
    const deg = Math.min(scrollY * 0.015, 15)
    return -8 + deg
  }, [scrollY])

  const d = useMemo(
    () => ({
      nav: {
        how: t('landing.nav.how'),
        features: t('landing.nav.features'),
        retail: t('landing.nav.retail'),
        pricing: t('landing.nav.pricing'),
      },
      hero: {
        chips: collectStrArr(t, exists, 'landing.hero.chips'),
        titlePrefix: t('landing.hero.titlePrefix'),
        rotating: collectStrArr(t, exists, 'landing.hero.rotating'),
        subtitle: t('landing.hero.subtitle'),
        primary: t('landing.hero.primary'),
        secondary: t('landing.hero.secondary'),
        proof: t('landing.hero.proof'),
        demo: {
          aria: t('landing.demo.aria'),
          phoneTitle: t('landing.demo.phoneTitle'),
          productBrand: t('landing.demo.productBrand'),
          productName: t('landing.demo.productName'),
          productMeta: t('landing.demo.productMeta'),
          status: t('landing.demo.status'),
          result: t('landing.demo.result'),
          chips: collectStrArr(t, exists, 'landing.demo.chips'),
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
        alternatives: exists('landing.fit.alternatives') ? t('landing.fit.alternatives') : '',
        disclaimer: t('landing.fit.disclaimer'),
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
        title: t('landing.video.title'),
        play: t('landing.video.play'),
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
        basic: {
          badge: t('landing.pricing.basic.badge'),
          title: t('landing.pricing.basic.title'),
          price: t('landing.pricing.basic.price'),
          features: collectStrArr(t, exists, 'landing.pricing.basic.feat'),
          note: exists('landing.pricing.basic.note') ? t('landing.pricing.basic.note') : '',
          cta: t('landing.pricing.basic.cta'),
        },
        pro: {
          badge: t('landing.pricing.pro.badge'),
          title: t('landing.pricing.pro.title'),
          features: collectStrArr(t, exists, 'landing.pricing.pro.feat'),
          cta: t('landing.pricing.pro.cta'),
        },
        enterprise: {
          badge: t('landing.pricing.enterprise.badge'),
          title: t('landing.pricing.enterprise.title'),
          features: collectStrArr(t, exists, 'landing.pricing.enterprise.feat'),
          cta: t('landing.pricing.enterprise.cta'),
        },
      },
      faq: {
        eyebrow: t('landing.faq.eyebrow'),
        title: t('landing.faq.title'),
        items: collectObjArr(t, exists, 'landing.faq.items', ['q', 'a']),
      },
      footer: {
        title: t('landing.footer.title'),
        text: t('landing.footer.text'),
        made: t('landing.footer.made'),
        copyright: t('landing.footer.copyright'),
        groups: (() => {
          const groups = collectObjArr(t, exists, 'landing.footer.groups', ['title'])
          return groups.map((g, i) => ({
            ...g,
            links: collectObjArr(t, exists, `landing.footer.groups.${i}.links`, ['label', 'href']),
          }))
        })(),
      },
    }),
    [t, exists]
  )

  return (
    <main className="landing-page-v2">
      <header className="landing-header">
        <a className="landing-brand" href="/" aria-label="Körset">
          <img src="/icon_logo.svg" alt="" />
          <span>Körset</span>
        </a>
        <nav className="landing-header__nav">
          <a href="#how">{d.nav.how}</a>
          <a href="#features">{d.nav.features}</a>
          <a href="#retail">{d.nav.retail}</a>
          <a href="#pricing">{d.nav.pricing}</a>
        </nav>
        <div className="landing-header__actions">
          <a className="landing-btn landing-btn--primary landing-btn--sm" href="/stores">
            {d.hero.primary}
          </a>
          <button
            className="landing-header__burger"
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <span
              className={`landing-header__burger-icon ${menuOpen ? 'landing-header__burger-icon--open' : ''}`}
            />
          </button>
        </div>
      </header>

      <div className={`landing-mobile-menu ${menuOpen ? 'landing-mobile-menu--open' : ''}`}>
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
          <a
            className="landing-btn landing-btn--primary"
            href="/stores"
            onClick={() => setMenuOpen(false)}
          >
            {d.hero.primary}
          </a>
        </nav>
      </div>

      <section className="landing-hero" data-testid="landing-consumer">
        <div className="landing-hero__copy">
          <div className="landing-pills" aria-label={t('landing.hero.chipsLabel')}>
            {d.hero.chips.map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
          </div>
          <h1>
            {d.hero.titlePrefix} <HeroRotatingWord words={d.hero.rotating} />
          </h1>
          <p>{d.hero.subtitle}</p>
          <div className="landing-hero__actions">
            <a className="landing-btn landing-btn--primary" href="/stores">
              {d.hero.primary}
              <Icon name="arrow_forward" />
            </a>
            <a className="landing-btn landing-btn--ghost" href="#how">
              {d.hero.secondary}
            </a>
          </div>
        </div>

        <div className="landing-hero__visual" aria-label={d.hero.demo.aria}>
          <div
            className="landing-phone-mockup"
            ref={phoneRef}
            style={{ transform: `rotateY(${phoneRotateY}deg) rotateX(2deg)` }}
          >
            <div className="landing-phone-mockup__notch" />
            <div className="landing-phone-mockup__screen">
              <div className="landing-phone-mockup__statusbar">
                <span>9:41</span>
                <div className="landing-phone-mockup__statusbar-icons">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <div className="landing-phone-mockup__scan-label">
                <span>{d.hero.demo.phoneTitle}</span>
                <Icon name="qr_code_scanner" />
              </div>
              <div className="landing-phone-mockup__fit-result">
                <div className="landing-phone-mockup__fit-dot" />
                <strong>{d.hero.demo.status}</strong>
              </div>
              <div className="landing-phone-mockup__product-info">
                <span className="landing-phone-mockup__product-name">
                  {d.hero.demo.productName}
                </span>
                <span className="landing-phone-mockup__product-meta">
                  {d.hero.demo.productMeta}
                </span>
              </div>
              <div className="landing-phone-mockup__result-chips">
                {d.hero.demo.chips.map((chip) => (
                  <span key={chip}>{chip}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="landing-hero__glow" aria-hidden="true" />
        </div>
      </section>

      <div className="landing-proof">
        <span>{d.hero.proof}</span>
        <div className="landing-proof__logos">
          <div className="landing-proof__logo" />
          <div className="landing-proof__logo" />
          <div className="landing-proof__logo" />
        </div>
      </div>

      <section className="landing-section" id="how">
        <SectionTitle eyebrow={d.how.eyebrow} title={d.how.title} text={d.how.text} />
        <div className="landing-steps">
          {d.how.steps.map((step, index) => (
            <article className="landing-step" key={step.title}>
              <span className="landing-step__number">0{index + 1}</span>
              <Icon name={step.icon} />
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-fit-demo">
        <SectionTitle eyebrow={d.fit.eyebrow} title={d.fit.title} text={d.fit.text} />
        <div className="landing-fit-grid">
          {d.fit.cards.map((card) => (
            <article className={`landing-fit-card landing-fit-card--${card.tone}`} key={card.title}>
              <div>
                <Icon name={card.icon} />
                <h3>{card.title}</h3>
              </div>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
        {d.fit.alternatives && (
          <div className="landing-fit-alternatives">
            <Icon name="compare_arrows" />
            <span>{d.fit.alternatives}</span>
          </div>
        )}
        <div className="landing-disclaimer">{d.fit.disclaimer}</div>
      </section>

      <section className="landing-section">
        <SectionTitle
          eyebrow={d.audience.eyebrow}
          title={d.audience.title}
          text={d.audience.text}
        />
        <div className="landing-audience-grid">
          {d.audience.cards.map((card) => (
            <article key={card.title}>
              <Icon name={card.icon} />
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="features">
        <SectionTitle
          eyebrow={d.features.eyebrow}
          title={d.features.title}
          text={d.features.text}
        />
        <div className="landing-feature-grid">
          {d.features.cards.map((card) => (
            <article className="landing-feature-card" key={card.title}>
              <div className="landing-feature-card__icon">
                <Icon name={card.icon} />
              </div>
              <div className="landing-feature-card__body">
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </div>
              {card.group && <span className="landing-feature-card__group">{card.group}</span>}
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-stats-section">
        <div className="landing-stats">
          {d.stats.map((stat) => (
            <div className="landing-stat" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section landing-video-section" aria-label={d.video.title}>
        <div className="landing-video">
          <div className="landing-video__bg" aria-hidden="true" />
          <button className="landing-video__play" type="button" aria-label={d.video.play}>
            <span className="landing-video__play-icon">▶</span>
          </button>
          <p className="landing-video__title">{d.video.title}</p>
        </div>
      </section>

      <section className="landing-section" id="retail" data-testid="landing-retail">
        <SectionTitle eyebrow={d.retail.eyebrow} title={d.retail.title} text={d.retail.text} />
        <div className="landing-retail-grid">
          {d.retail.cards.map((card) => (
            <article className="landing-retail-card" key={card.title}>
              <div className="landing-retail-card__icon">
                <Icon name={card.icon} />
              </div>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
        <div className="landing-retail-cta">
          <a className="landing-btn landing-btn--primary" href="/retail">
            {d.retail.cta}
            <Icon name="arrow_forward" />
          </a>
        </div>
      </section>

      <section
        className="landing-section landing-pricing"
        id="pricing"
        data-testid="landing-pricing"
      >
        <SectionTitle eyebrow={d.pricing.eyebrow} title={d.pricing.title} text={d.pricing.text} />
        <div className="landing-pricing-grid">
          <article className="landing-price-card landing-price-card--active">
            <span className="landing-price-card__badge landing-price-card__badge--active">
              {d.pricing.basic.badge}
            </span>
            <h3>{d.pricing.basic.title}</h3>
            <strong className="landing-price-card__price">{d.pricing.basic.price}</strong>
            <ul className="landing-price-card__features">
              {d.pricing.basic.features.map((feat) => (
                <li key={feat}>
                  <span className="landing-price-card__check" aria-hidden="true">
                    ✓
                  </span>
                  {feat}
                </li>
              ))}
            </ul>
            {d.pricing.basic.note && (
              <p className="landing-price-card__note">{d.pricing.basic.note}</p>
            )}
            <a className="landing-btn landing-btn--primary" href="/retail">
              {d.pricing.basic.cta}
            </a>
          </article>
          <article className="landing-price-card landing-price-card--locked">
            <span className="landing-price-card__badge">{d.pricing.pro.badge}</span>
            <h3>{d.pricing.pro.title}</h3>
            <ul className="landing-price-card__features">
              {d.pricing.pro.features.map((feat) => (
                <li key={feat}>
                  <span className="landing-price-card__check" aria-hidden="true">
                    ✓
                  </span>
                  {feat}
                </li>
              ))}
            </ul>
            <button
              className="landing-btn landing-btn--ghost landing-btn--disabled"
              type="button"
              disabled
            >
              {d.pricing.pro.cta}
            </button>
          </article>
          <article className="landing-price-card landing-price-card--locked">
            <span className="landing-price-card__badge">{d.pricing.enterprise.badge}</span>
            <h3>{d.pricing.enterprise.title}</h3>
            <ul className="landing-price-card__features">
              {d.pricing.enterprise.features.map((feat) => (
                <li key={feat}>
                  <span className="landing-price-card__check" aria-hidden="true">
                    ✓
                  </span>
                  {feat}
                </li>
              ))}
            </ul>
            <a className="landing-btn landing-btn--ghost" href="mailto:founder@korset.app">
              {d.pricing.enterprise.cta}
            </a>
          </article>
        </div>
      </section>

      <section className="landing-section landing-faq">
        <SectionTitle eyebrow={d.faq.eyebrow} title={d.faq.title} />
        {d.faq.items.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </section>

      <footer className="landing-footer-v2">
        <div className="landing-footer-v2__cta">
          <h2>{d.footer.title}</h2>
          <a className="landing-btn landing-btn--primary" href="/stores">
            {d.hero.primary}
          </a>
        </div>
        <div className="landing-footer-v2__grid">
          <div>
            <div className="landing-brand landing-brand--footer">
              <img src="/icon_logo.svg" alt="" />
              <span>Körset</span>
            </div>
            <p>{d.footer.text}</p>
          </div>
          {d.footer.groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h3>{group.title}</h3>
              {group.links.map((link) => (
                <a key={link.label} href={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>
          ))}
        </div>
        <div className="landing-footer-v2__bottom">
          <span>{d.footer.made}</span>
          <span>{d.footer.copyright}</span>
        </div>
      </footer>
    </main>
  )
}
