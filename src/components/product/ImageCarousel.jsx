import { useState, useRef } from 'react'
import { useI18n } from '../../i18n/index.js'

export default function ImageCarousel({
  images,
  fallbackEan,
  singleImage,
  onShare,
  onCopyLink,
  shareLabel,
  copyLabel,
}) {
  const { t } = useI18n()
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollRef = useRef(null)

  const finalImages =
    images && images.length > 0
      ? images
      : singleImage
        ? [singleImage]
        : fallbackEan
          ? [`/products/${fallbackEan}.png`]
          : []

  if (finalImages.length === 0) {
    return (
      <div
        className="catalog-img-box"
        style={{
          height: 280,
          borderRadius: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-dim)',
          fontSize: 14,
          position: 'relative',
        }}
      >
        {t('product.noPhoto')}
        {(onShare || onCopyLink) && (
          <ShareActions
            onShare={onShare}
            onCopyLink={onCopyLink}
            shareLabel={shareLabel}
            copyLabel={copyLabel}
          />
        )}
      </div>
    )
  }

  const handleScroll = () => {
    if (!scrollRef.current) return
    const scrollLeft = scrollRef.current.scrollLeft
    const width = scrollRef.current.offsetWidth
    const newIndex = Math.round(scrollLeft / width)
    setCurrentIndex(newIndex)
  }

  return (
    <div
      className="catalog-img-box"
      style={{
        position: 'relative',
        width: '100%',
        height: 280,
        borderRadius: 20 /* override to match product screen style */,
      }}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          width: '100%',
          height: '100%',
        }}
      >
        {finalImages.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            loading="lazy"
            className="product-img-blend"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              scrollSnapAlign: 'start',
              flexShrink: 0,
              padding: 24, // breathing room for the premium look
            }}
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        ))}
      </div>
      {finalImages.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {finalImages.map((_, i) => (
            <div
              key={i}
              style={{
                width: currentIndex === i ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: currentIndex === i ? 'var(--text)' : 'var(--text-faint)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      )}
      {(onShare || onCopyLink) && (
        <ShareActions
          onShare={onShare}
          onCopyLink={onCopyLink}
          shareLabel={shareLabel}
          copyLabel={copyLabel}
        />
      )}
    </div>
  )
}

// Two-button overlay: share icon (primary) + copy-link icon (secondary).
// Copy is always visible so users who don't get a "copy" option in the
// native share sheet still have a reliable way to grab the link.
function ShareActions({ onShare, onCopyLink, shareLabel, copyLabel }) {
  const btnBase = {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: 'none',
    background: 'rgba(0, 0, 0, 0.48)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#fff',
    flexShrink: 0,
    transition: 'opacity 0.15s, transform 0.12s',
    zIndex: 5,
  }

  const hoverHandlers = (el) => ({
    onMouseEnter: () => {
      if (el) el.style.opacity = '0.75'
    },
    onMouseLeave: () => {
      if (el) el.style.opacity = '1'
    },
    onMouseDown: () => {
      if (el) el.style.transform = 'scale(0.88)'
    },
    onMouseUp: () => {
      if (el) el.style.transform = 'scale(1)'
    },
  })

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        zIndex: 5,
      }}
    >
      {onCopyLink && (
        <button
          type="button"
          aria-label={copyLabel || 'Copy link'}
          onClick={(e) => {
            e.stopPropagation()
            onCopyLink()
          }}
          style={btnBase}
          ref={(el) => {
            if (!el) return
            el.onmouseenter = () => {
              el.style.opacity = '0.75'
            }
            el.onmouseleave = () => {
              el.style.opacity = '1'
            }
            el.onmousedown = () => {
              el.style.transform = 'scale(0.88)'
            }
            el.onmouseup = () => {
              el.style.transform = 'scale(1)'
            }
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
            link
          </span>
        </button>
      )}
      {onShare && (
        <button
          type="button"
          aria-label={shareLabel || 'Share'}
          onClick={(e) => {
            e.stopPropagation()
            onShare()
          }}
          style={btnBase}
          ref={(el) => {
            if (!el) return
            el.onmouseenter = () => {
              el.style.opacity = '0.75'
            }
            el.onmouseleave = () => {
              el.style.opacity = '1'
            }
            el.onmousedown = () => {
              el.style.transform = 'scale(0.88)'
            }
            el.onmouseup = () => {
              el.style.transform = 'scale(1)'
            }
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
            ios_share
          </span>
        </button>
      )}
    </div>
  )
}
