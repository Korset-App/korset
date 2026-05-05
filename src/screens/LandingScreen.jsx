import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

function ScanIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2 5V3a1 1 0 0 1 1-1h2M9 2h2a1 1 0 0 1 1 1v2M12 9v2a1 1 0 0 1-1 1H9M5 12H3a1 1 0 0 1-1-1V9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M3.5 7h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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

  return (
    <span className={`lp-rotating lp-rotating--${phase}`} aria-live="polite">
      <span className="lp-rotating__word">{words[index]}</span>
    </span>
  )
}

function HeroVideoStage({ poster, posterAlt, caption, playLabel }) {
  const stageRef = useRef(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0, active: false })

  const handleMove = useCallback((e) => {
    const node = stageRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setPointer({ x, y, active: true })
  }, [])

  const handleLeave = useCallback(() => {
    setPointer({ x: 0, y: 0, active: false })
  }, [])

  const tilt = pointer.active
    ? `perspective(1400px) rotateX(${pointer.y * -3}deg) rotateY(${pointer.x * 4}deg)`
    : 'perspective(1400px) rotateX(0deg) rotateY(0deg)'

  const playOffset = pointer.active
    ? `translate3d(${pointer.x * 14}px, ${pointer.y * 14}px, 0) scale(1.04)`
    : 'translate3d(0, 0, 0) scale(1)'

  return (
    <div
      ref={stageRef}
      className="lp-hero-video"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ transform: tilt }}
    >
      <div className="lp-hero-video__frame">
        <img
          src={poster}
          alt={posterAlt}
          className="lp-hero-video__poster"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="lp-hero-video__overlay" aria-hidden="true" />
        <div className="lp-hero-video__grain" aria-hidden="true" />
        <button
          type="button"
          className="lp-hero-video__play"
          aria-label={playLabel}
          style={{ transform: playOffset }}
        >
          <span className="lp-hero-video__play-ring" aria-hidden="true" />
          <span className="lp-hero-video__play-core" aria-hidden="true">
            <PlayIcon />
          </span>
        </button>
        <div className="lp-hero-video__caption">{caption}</div>
        <div className="lp-hero-video__corner lp-hero-video__corner--tl" aria-hidden="true" />
        <div className="lp-hero-video__corner lp-hero-video__corner--tr" aria-hidden="true" />
        <div className="lp-hero-video__corner lp-hero-video__corner--bl" aria-hidden="true" />
        <div className="lp-hero-video__corner lp-hero-video__corner--br" aria-hidden="true" />
      </div>
      <div className="lp-hero-video__glow" aria-hidden="true" />
      <div className="lp-hero-video__chip lp-hero-video__chip--tl">
        <span className="lp-hero-video__chip-dot" />
        Live demo
      </div>
      <div className="lp-hero-video__chip lp-hero-video__chip--br">
        <ScanIcon /> ~0.6s
      </div>
    </div>
  )
}

export default function LandingScreen() {
  const { t, exists } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const rootRef = useRef(null)

  useReveal(rootRef)

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
          'https://images.unsplash.com/photo-1604719174242-0e89e5c1d02d?auto=format&fit=crop&w=1600&q=80',
        posterAlt: exists('landing.heroVideo.posterAlt') ? t('landing.heroVideo.posterAlt') : '',
        caption: exists('landing.heroVideo.caption') ? t('landing.heroVideo.caption') : '',
        play: exists('landing.heroVideo.play') ? t('landing.heroVideo.play') : '',
      },
    }),
    [t, exists]
  )

  return (
    <main className="lp-page" ref={rootRef}>
      <div className="lp-bg-mesh" aria-hidden="true" />
      <div className="lp-bg-grain" aria-hidden="true" />

      <header className={`lp-header ${scrolled ? 'lp-header--scrolled' : ''}`}>
        <div className="lp-header__inner">
          <a className="lp-brand" href="/" aria-label="Körset">
            <img src="/icon_logo.svg" alt="" className="lp-brand__mark" />
            <span className="lp-brand__name">Körset</span>
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
        <div className="lp-hero__inner">
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
              <span className="lp-hero__title-line">{d.hero.titlePrefix}</span>
              <span className="lp-hero__title-line lp-hero__title-line--rotating">
                <HeroRotatingWord words={d.hero.rotating} />
              </span>
            </h1>

            <p className="lp-hero__subtitle lp-reveal lp-reveal--delay-1">{d.hero.subtitle}</p>

            <div className="lp-hero__actions lp-reveal lp-reveal--delay-2">
              <a className="lp-btn lp-btn--primary lp-btn--lg" href="/stores">
                <span>{d.hero.primary}</span>
                <ArrowIcon />
              </a>
              <a className="lp-btn lp-btn--ghost lp-btn--lg" href="#how">
                <span className="lp-btn__playdot" aria-hidden="true">
                  <PlayIcon />
                </span>
                <span>{d.hero.secondary}</span>
              </a>
            </div>

            {d.hero.tagline && (
              <div className="lp-hero__tagline lp-reveal lp-reveal--delay-3">
                {d.hero.tagline.split('·').map((part, i, arr) => (
                  <span key={part}>
                    <CheckMicroIcon />
                    <span>{part.trim()}</span>
                    {i < arr.length - 1 && <em aria-hidden="true" />}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="lp-hero__visual lp-reveal lp-reveal--scale lp-reveal--delay-2">
            <HeroVideoStage
              poster={d.heroVideo.poster}
              posterAlt={d.heroVideo.posterAlt}
              caption={d.heroVideo.caption}
              playLabel={d.heroVideo.play}
            />
          </div>
        </div>

        <div className="lp-hero__scroll-cue" aria-hidden="true">
          <span />
        </div>
      </section>

      {/* Этапы 2-7 — будут добавляться поэтапно. */}
      <section className="lp-section lp-stage-placeholder" id="how">
        <div className="lp-stage-placeholder__inner">
          <span className="lp-stage-placeholder__chip">Этап 2-7 · в разработке</span>
          <h2>Остальные секции добавляются поэтапно</h2>
          <p>
            Demo · How · Fit-Check · Аудитория · Возможности · Stats · Видео · Магазинам · Тарифы ·
            FAQ · 3D-полка · CTA · Footer
          </p>
        </div>
      </section>
    </main>
  )
}
