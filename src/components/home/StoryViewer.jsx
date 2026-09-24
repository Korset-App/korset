import { useEffect, useRef, useState } from 'react'
import {
  StorefrontIcon,
  InventoryIcon,
  BarcodeScannerIcon,
  VerifiedBadgeIcon,
  SparklesIcon,
  CloseIcon,
  ArrowForwardIcon,
} from '../icons/index.js'
import { getStorySlideMedia } from '../../domain/home/homeScreenModel.js'
import './StoryViewer.css'

function StoryHeaderIcon({ icon, size = 14 }) {
  switch (icon) {
    case 'storefront':
      return <StorefrontIcon size={size} />
    case 'auto_stories':
      return <InventoryIcon size={size} strokeWidth={1.8} />
    case 'barcode_scanner':
      return <BarcodeScannerIcon size={size} strokeWidth={1.8} />
    case 'shield_with_heart':
      return <VerifiedBadgeIcon size={size} />
    case 'auto_awesome':
    case 'sparkles':
      return <SparklesIcon size={size} />
    default:
      return <StorefrontIcon size={size} />
  }
}

export default function StoryViewer({
  story,
  storyIndex,
  slideIndex,
  store,
  catalogProducts,
  t,
  onClose,
  onSlide,
  onSlideView,
  onCta,
}) {
  const [isPaused, setIsPaused] = useState(false)
  const touchStartYRef = useRef(0)
  const slideKey = story?.slides?.[slideIndex] || `${story?.key}.0`
  const currentMedia = getStorySlideMedia(story, slideIndex)

  const vars = {
    storeName: store?.name || 'Körset',
    catalogCount: catalogProducts?.length || 10240,
    address: [store?.city, store?.address].filter(Boolean).join(', ') || '',
  }

  // Report slide view immediately when slide is viewed
  useEffect(() => {
    if (!story?.key) return
    onSlideView?.(story.key, slideIndex, story.slides?.length || 3)
  }, [story?.key, slideIndex, onSlideView, story?.slides?.length])

  // Pause progress when page/tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      setIsPaused(document.hidden)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Body lock
  useEffect(() => {
    document.body.classList.add('story-viewer-open')
    return () => {
      document.body.classList.remove('story-viewer-open')
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onSlide(1)
      if (e.key === 'ArrowLeft') onSlide(-1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onSlide])

  // Touch swipe down to close
  const handleTouchStart = (e) => {
    touchStartYRef.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e) => {
    const diffY = e.changedTouches[0].clientY - touchStartYRef.current
    if (diffY > 70) {
      onClose()
    }
  }

  if (!story) return null

  const kickerText = t(`home.stories.${story.key}.kicker`, vars)

  return (
    <div
      className="story-viewer-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={t(`home.stories.${story.key}.title`, vars)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onPointerDown={() => setIsPaused(true)}
      onPointerUp={() => setIsPaused(false)}
      onPointerLeave={() => setIsPaused(false)}
    >
      <button
        className="story-viewer__backdrop"
        type="button"
        aria-label={t('common.close')}
        onClick={onClose}
      />

      <article className={`story-viewer__frame story-tone--${story.tone || 'emerald'}`}>
        {/* Full-bleed Media Stage */}
        <div className="story-viewer__media-stage" aria-hidden="true">
          {currentMedia && (
            <img
              key={`${story.key}_${slideIndex}`}
              src={currentMedia}
              alt=""
              className="story-viewer__media-img"
              style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
              onError={(e) => {
                if (story?.image && !e.currentTarget.src.endsWith(story.image)) {
                  e.currentTarget.src = story.image
                }
              }}
            />
          )}
          <div className="story-viewer__scrim story-viewer__scrim--top" />
          <div className="story-viewer__scrim story-viewer__scrim--bottom" />
        </div>

        {/* Top Progress Bars */}
        <div className="story-viewer__progress-wrap" aria-hidden="true">
          {story.slides.map((s, idx) => {
            const isCompleted = idx < slideIndex
            const isActive = idx === slideIndex
            return (
              <div key={s} className="story-viewer__progress-bar">
                {isCompleted && <div className="story-viewer__progress-fill is-completed" />}
                {isActive && (
                  <div
                    key={`${story.key}_${slideIndex}`}
                    className="story-viewer__progress-fill is-active"
                    style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
                    onAnimationEnd={() => onSlide(1)}
                  />
                )}
                {!isCompleted && !isActive && (
                  <div className="story-viewer__progress-fill is-pending" />
                )}
              </div>
            )
          })}
        </div>

        {/* Header with store badge & close button */}
        <header className="story-viewer__top">
          <div className="story-viewer__store-badge">
            <div className="story-viewer__store-icon">
              <StoryHeaderIcon icon={story.icon} size={14} />
            </div>
            <span className="story-viewer__store-name">{vars.storeName}</span>
          </div>

          <button
            type="button"
            className="story-viewer__close"
            aria-label={t('common.close')}
            onClick={onClose}
          >
            <CloseIcon size={20} />
          </button>
        </header>

        {/* Left / Right Tap Zones for navigation */}
        <div
          className="story-viewer__tap-zone story-viewer__tap-zone--left"
          onClick={() => onSlide(-1)}
          role="button"
          tabIndex={-1}
          aria-label={t('home.storyPrev')}
        />
        <div
          className="story-viewer__tap-zone story-viewer__tap-zone--right"
          onClick={() => onSlide(1)}
          role="button"
          tabIndex={-1}
          aria-label={t('home.storyNext')}
        />

        {/* Bottom Card Content & CTA */}
        <div className="story-viewer__bottom">
          <div className="story-viewer__content">
            {kickerText ? <p className="story-viewer__kicker">{kickerText}</p> : null}
            <h2 className="story-viewer__title">{t(`home.storySlides.${slideKey}.title`, vars)}</h2>
            <p className="story-viewer__text">{t(`home.storySlides.${slideKey}.text`, vars)}</p>
          </div>

          <button className="story-viewer__cta" type="button" onClick={onCta}>
            <span>{t(`home.stories.${story.key}.cta`, vars)}</span>
            <ArrowForwardIcon size={18} />
          </button>
        </div>
      </article>
    </div>
  )
}
