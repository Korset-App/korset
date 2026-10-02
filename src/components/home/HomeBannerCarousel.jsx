import { useCallback, useEffect, useRef, useState } from 'react'
import { AIChatIcon, InstallIcon, SendIcon } from '../icons/index.js'
import './HomeBannerCarousel.css'

const AUTOPLAY_INTERVAL_MS = 8000

export default function HomeBannerCarousel({
  banners = [],
  onBannerAction,
  installPending = false,
  t,
}) {
  const [activeId, setActiveId] = useState(banners[0]?.id)
  const [paused, setPaused] = useState(false)
  const trackRef = useRef(null)
  const slideRefs = useRef([])
  const sectionRef = useRef(null)
  const interactionRef = useRef({
    hovered: false,
    touching: false,
    focused: false,
    visible: false,
    last: 0,
  })
  const activeIndex = Math.max(
    0,
    banners.findIndex((banner) => banner.id === activeId)
  )
  const activeIndexRef = useRef(activeIndex)
  const bannerIds = banners.map(({ id }) => id).join(',')

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  const scrollToSlide = useCallback((index) => {
    const track = trackRef.current
    const slide = slideRefs.current[index]
    if (!track || !slide) return
    track.scrollTo({
      left: slide.offsetLeft - slideRefs.current[0].offsetLeft,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    })
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const index = Math.min(activeIndexRef.current, banners.length - 1)
    const slide = slideRefs.current[index]
    if (slide)
      track.scrollTo({
        left: slide.offsetLeft - slideRefs.current[0].offsetLeft,
        behavior: 'instant',
      })
  }, [bannerIds, banners.length])

  useEffect(() => {
    const track = trackRef.current
    if (!track || typeof window.ResizeObserver === 'undefined') return
    let width = track.clientWidth
    const observer = new window.ResizeObserver(() => {
      if (track.clientWidth === width) return
      width = track.clientWidth
      const slide = slideRefs.current[activeIndexRef.current]
      if (slide)
        track.scrollTo({
          left: slide.offsetLeft - slideRefs.current[0].offsetLeft,
          behavior: 'instant',
        })
    })
    observer.observe(track)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section || typeof IntersectionObserver === 'undefined') {
      interactionRef.current.visible = true
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        interactionRef.current.visible = entry.isIntersecting
      },
      { threshold: 0.2 }
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (paused || banners.length < 2) return
    const timer = window.setInterval(() => {
      const state = interactionRef.current
      if (
        state.hovered ||
        state.touching ||
        state.focused ||
        !state.visible ||
        document.hidden ||
        Date.now() - state.last < AUTOPLAY_INTERVAL_MS ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      )
        return
      scrollToSlide((activeIndexRef.current + 1) % banners.length)
    }, AUTOPLAY_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [banners.length, paused, scrollToSlide])

  const recordInteraction = useCallback(() => {
    interactionRef.current.last = Date.now()
  }, [])

  const handleScroll = () => {
    const track = trackRef.current
    if (!track) return
    const first = slideRefs.current[0]
    let nearest = 0
    let distance = Infinity
    banners.forEach((banner, index) => {
      const slide = slideRefs.current[index]
      if (!slide || !first) return
      const nextDistance = Math.abs(slide.offsetLeft - first.offsetLeft - track.scrollLeft)
      if (nextDistance < distance) {
        distance = nextDistance
        nearest = index
      }
    })
    setActiveId(banners[nearest]?.id)
  }

  const handleKeyDown = (event) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    recordInteraction()
    let next =
      event.key === 'ArrowRight'
        ? (activeIndex + 1) % banners.length
        : (activeIndex - 1 + banners.length) % banners.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = banners.length - 1
    scrollToSlide(next)
  }

  if (!banners.length) return null

  const act = (banner, actionType = banner.actionType) => {
    recordInteraction()
    onBannerAction?.({ ...banner, actionType })
  }

  return (
    <section
      ref={sectionRef}
      className="home-banner-carousel"
      aria-label={t('home.banners.sectionLabel')}
      aria-roledescription={t('home.banners.carouselLabel')}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') interactionRef.current.hovered = true
      }}
      onPointerLeave={() => {
        interactionRef.current.hovered = false
        interactionRef.current.touching = false
        recordInteraction()
      }}
      onPointerDown={() => {
        interactionRef.current.touching = true
        recordInteraction()
      }}
      onPointerUp={() => {
        interactionRef.current.touching = false
      }}
      onPointerCancel={() => {
        interactionRef.current.touching = false
      }}
      onFocusCapture={() => {
        interactionRef.current.focused = true
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          interactionRef.current.focused = false
          recordInteraction()
        }
      }}
    >
      <div
        ref={trackRef}
        className="home-banner-carousel__track"
        tabIndex={0}
        role="group"
        aria-label={t('home.banners.sectionLabel')}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        onWheel={recordInteraction}
      >
        {banners.map((banner, index) => (
          <article
            key={banner.id}
            ref={(node) => {
              slideRefs.current[index] = node
            }}
            className={`home-banner-card home-banner-card--${banner.id}`}
            aria-label={t('home.banners.slideLabel', { number: index + 1, total: banners.length })}
            aria-roledescription={t('home.banners.slideRole')}
          >
            <div className="home-banner-card__media" aria-hidden="true">
              <img
                src={banner.image}
                alt=""
                width={1200}
                height={675}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                fetchpriority={index === 0 ? 'high' : 'auto'}
              />
            </div>
            <div className="home-banner-card__overlay" aria-hidden="true" />
            {['scan', 'store', 'pwa'].includes(banner.id) && (
              <button
                className="home-banner-card__whole-action"
                type="button"
                tabIndex={index === activeIndex ? 0 : -1}
                disabled={banner.id === 'pwa' && installPending}
                onClick={() => act(banner)}
                aria-label={`${t(banner.ctaKey)}: ${t(banner.headlineKey)}`}
              />
            )}
            {['compare', 'store'].includes(banner.id) && (
              <span className="home-banner-card__example-label">
                {t('home.banners.compare.example')}
              </span>
            )}
            <div className="home-banner-card__content">
              <h2 className="home-banner-card__headline">{t(banner.headlineKey)}</h2>
              {banner.id === 'dinner' ? (
                <div className="home-banner-card__dialogue">
                  <div className="home-banner-card__message home-banner-card__message--question">
                    {t('home.banners.dinner.question')
                      .split(/(\d[\d\s]*₸)/)
                      .map((part, index) =>
                        index % 2 ? (
                          <span className="home-banner-card__amount" key={index}>
                            {part}
                          </span>
                        ) : (
                          part
                        )
                      )}
                  </div>
                  <div className="home-banner-card__message home-banner-card__message--answer">
                    <span className="home-banner-card__assistant">
                      <AIChatIcon active size={16} />
                      <span>{t('home.banners.dinner.assistant')}</span>
                    </span>
                    <span>{t('home.banners.dinner.answer')}</span>
                  </div>
                </div>
              ) : (
                <p className="home-banner-card__description">{t(banner.descriptionKey)}</p>
              )}
              {banner.id === 'scan' ? null : banner.id === 'store' ? (
                <span className="home-banner-card__catalog-link">{t(banner.ctaKey)}</span>
              ) : banner.id === 'pwa' ? (
                <span className="home-banner-card__cta home-banner-card__cta--pwa">
                  <InstallIcon size={19} />
                  <span>{t(banner.ctaKey)}</span>
                </span>
              ) : banner.id === 'dinner' ? (
                <button
                  type="button"
                  className="home-banner-card__composer"
                  onClick={() => act(banner)}
                  tabIndex={index === activeIndex ? 0 : -1}
                  aria-label={t(banner.ctaKey)}
                >
                  <span>{t('home.banners.dinner.followUp')}</span>
                  <span className="home-banner-card__send">
                    <SendIcon size={20} />
                  </span>
                </button>
              ) : (
                <div className="home-banner-card__actions">
                  <button
                    type="button"
                    className={`home-banner-card__cta home-banner-card__cta--${banner.id}`}
                    onClick={() => act(banner)}
                    tabIndex={index === activeIndex ? 0 : -1}
                    aria-label={t(banner.ctaKey)}
                  >
                    <span>{t(banner.ctaKey)}</span>
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      <div className="home-banner-carousel__controls">
        <span className="home-banner-carousel__count" aria-hidden="true">
          {String(activeIndex + 1).padStart(2, '0')}{' '}
          <span>/ {String(banners.length).padStart(2, '0')}</span>
        </span>
        <nav
          className="home-banner-carousel__pagination"
          aria-label={t('home.banners.paginationLabel')}
        >
          {banners.map((banner, index) => (
            <button
              key={banner.id}
              type="button"
              className={`home-banner-carousel__dot${activeIndex === index ? ' is-active' : ''}`}
              aria-current={activeIndex === index ? 'true' : undefined}
              aria-label={t('home.banners.goToSlide', { number: index + 1 })}
              onClick={() => {
                recordInteraction()
                scrollToSlide(index)
              }}
            >
              <span />
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="home-banner-carousel__pause"
          aria-label={t(paused ? 'home.banners.play' : 'home.banners.pause')}
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
            {paused ? <path d="m5 3 8 5-8 5Z" /> : <path d="M4 3h3v10H4zm5 0h3v10H9z" />}
          </svg>
        </button>
      </div>
    </section>
  )
}
