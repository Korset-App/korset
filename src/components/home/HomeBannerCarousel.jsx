import { useCallback, useEffect, useRef, useState } from 'react'
import { BarcodeScannerIcon, SlidersIcon, SparklesIcon, StorefrontIcon } from '../icons/index.js'
import './HomeBannerCarousel.css'

function BannerCtaIcon({ icon, size = 14 }) {
  if (icon === 'scan') {
    return <BarcodeScannerIcon size={size} color="currentColor" strokeWidth={1.9} />
  }
  if (icon === 'fit') {
    return <SlidersIcon size={size} color="currentColor" />
  }
  if (icon === 'ai') {
    return <SparklesIcon size={size} color="currentColor" />
  }
  if (icon === 'store') {
    return <StorefrontIcon size={size} color="currentColor" />
  }
  return null
}

const AUTOPLAY_INTERVAL_MS = 5500

export default function HomeBannerCarousel({ banners = [], onBannerAction, t }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const trackRef = useRef(null)
  const slideRefs = useRef([])
  const isHoveredRef = useRef(false)
  const isTouchingRef = useRef(false)
  const isFocusedRef = useRef(false)
  const activeIndexRef = useRef(0)

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  const scrollToSlide = useCallback((targetIndex) => {
    const slideEl = slideRefs.current[targetIndex]
    const track = trackRef.current
    if (!slideEl || !track) return

    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    slideEl.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'start',
    })
    setActiveIndex(targetIndex)
  }, [])

  // Auto-advance with pause on interaction / hidden tab / reduced-motion
  useEffect(() => {
    if (banners.length <= 1) return
    if (typeof window === 'undefined') return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const tick = () => {
      if (
        isHoveredRef.current ||
        isTouchingRef.current ||
        isFocusedRef.current ||
        document.hidden
      ) {
        return
      }
      const nextIndex = (activeIndexRef.current + 1) % banners.length
      scrollToSlide(nextIndex)
    }

    const timerId = setInterval(tick, AUTOPLAY_INTERVAL_MS)

    return () => {
      clearInterval(timerId)
    }
  }, [banners.length, scrollToSlide])

  // Detect active slide using IntersectionObserver (lightweight, decoupled from scroll loop)
  useEffect(() => {
    const track = trackRef.current
    if (!track || typeof IntersectionObserver === 'undefined' || banners.length <= 1) return

    const observers = []
    slideRefs.current.forEach((slideEl, index) => {
      if (!slideEl) return

      const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries
          if (entry && entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            setActiveIndex(index)
          }
        },
        {
          root: track,
          threshold: [0.55],
        }
      )
      observer.observe(slideEl)
      observers.push(observer)
    })

    return () => {
      observers.forEach((obs) => obs.disconnect())
    }
  }, [banners.length])

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      const next = (activeIndex + 1) % banners.length
      scrollToSlide(next)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      const prev = (activeIndex - 1 + banners.length) % banners.length
      scrollToSlide(prev)
    }
  }

  if (!banners || banners.length === 0) return null

  const sectionLabel = t('home.banners.sectionLabel') || 'Полезные возможности'
  const paginationLabel = t('home.banners.paginationLabel') || 'Навигация по баннерам'

  return (
    <section
      className="home-banner-carousel"
      aria-label={sectionLabel}
      onMouseEnter={() => {
        isHoveredRef.current = true
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false
      }}
      onTouchStart={() => {
        isTouchingRef.current = true
      }}
      onTouchEnd={() => {
        isTouchingRef.current = false
      }}
      onFocusCapture={() => {
        isFocusedRef.current = true
      }}
      onBlurCapture={() => {
        isFocusedRef.current = false
      }}
    >
      <div
        ref={trackRef}
        className="home-banner-carousel__track"
        role="region"
        aria-roledescription="carousel"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {banners.map((banner, index) => {
          const isActive = index === activeIndex
          const headlineText = t(banner.headlineKey)
          const kickerText = t(banner.kickerKey)
          const descriptionText = t(banner.descriptionKey)
          const ctaText = t(banner.ctaKey)

          return (
            <div
              key={banner.id}
              ref={(el) => {
                if (el) slideRefs.current[index] = el
              }}
              className={`home-banner-card home-banner-card--${banner.tone} home-banner-card--${banner.id}${isActive ? ' is-active' : ''}`}
              role="group"
              aria-roledescription="slide"
              aria-label={headlineText}
              onClick={() => onBannerAction && onBannerAction(banner)}
            >
              <div className="home-banner-card__media" aria-hidden="true">
                <img
                  src={banner.image}
                  alt=""
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  {...(index === 0 ? { fetchpriority: 'high' } : {})}
                />
                <span className="home-banner-card__overlay" />
                <span
                  className={`home-banner-card__visual-graphic home-banner-card__visual-graphic--${banner.id}`}
                />
              </div>

              <div className="home-banner-card__content">
                {kickerText && <span className="home-banner-card__kicker">{kickerText}</span>}
                <h2 className="home-banner-card__headline">{headlineText}</h2>

                {banner.id === 'fitCheck' && (
                  <div className="home-banner-card__chips-preview" aria-hidden="true">
                    <span className="home-banner-card__chip home-banner-card__chip--halal">
                      ✓ Халал
                    </span>
                    <span className="home-banner-card__chip">✓ Без сахара</span>
                    <span className="home-banner-card__chip">✓ Аллергены</span>
                  </div>
                )}

                {banner.id === 'ai' && (
                  <div className="home-banner-card__prompt-bubble" aria-hidden="true">
                    <span className="home-banner-card__prompt-sparkle">✨</span>
                    <span className="home-banner-card__prompt-text">«Собери ужин до 3 500 ₸»</span>
                  </div>
                )}

                {banner.id === 'store' && (
                  <div className="home-banner-card__store-pill" aria-hidden="true">
                    <span className="home-banner-card__store-dot" />
                    <span>Каталог & цены у полки</span>
                  </div>
                )}

                {descriptionText && banner.id !== 'fitCheck' && banner.id !== 'ai' && (
                  <p className="home-banner-card__description">{descriptionText}</p>
                )}

                <div className="home-banner-card__actions">
                  <button
                    type="button"
                    className="home-banner-card__cta"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onBannerAction) onBannerAction(banner)
                    }}
                    aria-label={`${ctaText}: ${headlineText}`}
                  >
                    <BannerCtaIcon icon={banner.ctaIcon} size={14} />
                    <span>{ctaText}</span>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {banners.length > 1 && (
        <nav className="home-banner-carousel__pagination" aria-label={paginationLabel}>
          {banners.map((banner, index) => {
            const isActive = index === activeIndex
            const dotLabel =
              t('home.banners.goToSlide', { number: index + 1 }) || `Баннер ${index + 1}`
            return (
              <button
                key={banner.id}
                type="button"
                className={`home-banner-carousel__dot ${isActive ? 'is-active' : ''}`}
                aria-current={isActive ? 'true' : undefined}
                aria-label={dotLabel}
                onClick={() => scrollToSlide(index)}
              />
            )
          })}
        </nav>
      )}
    </section>
  )
}
