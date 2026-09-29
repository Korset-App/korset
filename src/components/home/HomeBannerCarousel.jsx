import { useCallback, useEffect, useRef, useState } from 'react'
import { BarcodeScannerIcon, SlidersIcon, SparklesIcon } from '../icons/index.js'
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
  return null
}

export default function HomeBannerCarousel({ banners = [], onBannerAction, t }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const trackRef = useRef(null)
  const slideRefs = useRef([])

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
      const next = Math.min(banners.length - 1, activeIndex + 1)
      scrollToSlide(next)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      const prev = Math.max(0, activeIndex - 1)
      scrollToSlide(prev)
    }
  }

  if (!banners || banners.length === 0) return null

  const sectionLabel = t('home.banners.sectionLabel') || 'Полезные возможности'
  const paginationLabel = t('home.banners.paginationLabel') || 'Навигация по баннерам'

  return (
    <section className="home-banner-carousel" aria-label={sectionLabel}>
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
              className={`home-banner-card home-banner-card--${banner.tone}${isActive ? ' is-active' : ''}`}
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
              </div>

              <div className="home-banner-card__content">
                {kickerText && <span className="home-banner-card__kicker">{kickerText}</span>}
                <h2 className="home-banner-card__headline">{headlineText}</h2>
                {descriptionText && (
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
