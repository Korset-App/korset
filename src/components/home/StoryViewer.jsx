import { useEffect, useRef, useState } from 'react'
import './StoryViewer.css'

function StoryArt({ storyKey, store, catalogProducts, t }) {
  const storeName = store?.name || 'Körset'
  const count = catalogProducts?.length || 10240

  if (storyKey === 'store') {
    return (
      <div className="story-art-store">
        <div className="story-art-store__emblem">
          <span className="material-symbols-outlined" style={{ fontSize: 44 }}>
            storefront
          </span>
        </div>
        <div className="story-art-store__pill">
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#34d399' }}>
            inventory_2
          </span>
          <span>{count} товаров онлайн</span>
        </div>
      </div>
    )
  }

  if (storyKey === 'scan') {
    return (
      <div className="story-art-scan">
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 48, color: 'rgba(255,255,255,0.7)' }}
        >
          barcode
        </span>
        <div className="story-art-scan__laser" />
        <div className="story-art-scan__tag">0.3 сек</div>
      </div>
    )
  }

  if (storyKey === 'halal') {
    return (
      <div className="story-art-halal">
        <div className="story-art-halal__stamp">
          <span className="material-symbols-outlined" style={{ fontSize: 44 }}>
            verified
          </span>
        </div>
        <div className="story-art-halal__verified">Халал Даму · 100%</div>
      </div>
    )
  }

  if (storyKey === 'safety') {
    return (
      <div className="story-art-safety">
        <div className="story-art-safety__shield">
          <span className="material-symbols-outlined" style={{ fontSize: 42 }}>
            shield_with_heart
          </span>
        </div>
        <div className="story-art-safety__badge-list">
          <span className="story-art-safety__badge">Без глютена</span>
          <span className="story-art-safety__badge">Без сахара</span>
          <span className="story-art-safety__badge">Без лактозы</span>
        </div>
      </div>
    )
  }

  if (storyKey === 'ai') {
    return (
      <div className="story-art-ai">
        <div className="story-art-ai__user-msg">Что приготовить из курицы и риса?</div>
        <div className="story-art-ai__bot-msg">
          👨‍🍳 Ингредиенты на полке {storeName}: филе цыпленка, рис для плова, морковь и зира!
        </div>
      </div>
    )
  }

  return (
    <div className="story-art-store">
      <div className="story-art-store__emblem">
        <span className="material-symbols-outlined" style={{ fontSize: 44 }}>
          auto_awesome
        </span>
      </div>
    </div>
  )
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
  onCta,
}) {
  const [progress, setProgress] = useState(0)
  const isPausedRef = useRef(false)
  const touchStartYRef = useRef(0)
  const slideKey = story?.slides?.[slideIndex] || `${story?.key}.0`

  const vars = {
    storeName: store?.name || 'Körset',
    catalogCount: catalogProducts?.length || 10240,
    address: [store?.city, store?.address].filter(Boolean).join(', ') || '',
  }

  // Timer progression (4500ms)
  useEffect(() => {
    setProgress(0)
    const DURATION = 4500
    const startTime = Date.now()

    const interval = setInterval(() => {
      if (isPausedRef.current) return
      const elapsed = Date.now() - startTime
      const p = Math.min(elapsed / DURATION, 1)
      setProgress(p)
      if (p >= 1) {
        clearInterval(interval)
        onSlide(1)
      }
    }, 40)

    return () => clearInterval(interval)
  }, [slideIndex, story?.key, onSlide])

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

  return (
    <div
      className="story-viewer-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={t(`home.stories.${story.key}.title`, vars)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onPointerDown={() => {
        isPausedRef.current = true
      }}
      onPointerUp={() => {
        isPausedRef.current = false
      }}
      onPointerLeave={() => {
        isPausedRef.current = false
      }}
    >
      <button
        className="story-viewer__backdrop"
        type="button"
        aria-label={t('common.close')}
        onClick={onClose}
      />

      <article className={`story-viewer__frame story-tone--${story.tone || 'emerald'}`}>
        <div className="story-viewer__bg" />

        {/* Top Progress Bars */}
        <div className="story-viewer__progress-wrap" aria-hidden="true">
          {story.slides.map((s, idx) => {
            let scale = 0
            if (idx < slideIndex) scale = 1
            else if (idx === slideIndex) scale = progress
            return (
              <div key={s} className="story-viewer__progress-bar">
                <div
                  className="story-viewer__progress-fill"
                  style={{ transform: `scaleX(${scale})` }}
                />
              </div>
            )
          })}
        </div>

        {/* Header with store badge & close */}
        <header className="story-viewer__top">
          <div className="story-viewer__store-badge">
            <div className="story-viewer__store-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {story.icon || 'storefront'}
              </span>
            </div>
            <span className="story-viewer__store-name">{vars.storeName}</span>
          </div>

          <button
            type="button"
            className="story-viewer__close"
            aria-label={t('common.close')}
            onClick={onClose}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              close
            </span>
          </button>
        </header>

        {/* Center Visual Art */}
        <div className="story-viewer__visual">
          <StoryArt storyKey={story.key} store={store} catalogProducts={catalogProducts} t={t} />
        </div>

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
          <div className="story-viewer__content-card">
            <p className="story-viewer__kicker">{t(`home.stories.${story.key}.kicker`, vars)}</p>
            <h2 className="story-viewer__title">{t(`home.storySlides.${slideKey}.title`, vars)}</h2>
            <p className="story-viewer__text">{t(`home.storySlides.${slideKey}.text`, vars)}</p>
          </div>

          <button className="story-viewer__cta" type="button" onClick={onCta}>
            <span>{t(`home.stories.${story.key}.cta`, vars)}</span>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              arrow_forward
            </span>
          </button>
        </div>
      </article>
    </div>
  )
}
