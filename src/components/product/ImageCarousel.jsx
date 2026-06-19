import { useState, useRef } from 'react'
import { useI18n } from '../../i18n/index.js'

export default function ImageCarousel({ images, fallbackEan, singleImage, onShare, shareLabel }) {
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
        {onShare && <ShareButton onShare={onShare} label={shareLabel} />}
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
      {onShare && <ShareButton onShare={onShare} label={shareLabel} />}
    </div>
  )
}

function ShareButton({ onShare, label }) {
  return (
    <button
      type="button"
      aria-label={label || 'Share'}
      onClick={(e) => {
        e.stopPropagation()
        onShare()
      }}
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 10,
        border: 'none',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#fff',
        flexShrink: 0,
        transition: 'opacity 0.15s, transform 0.15s',
        zIndex: 5,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '0.8'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1'
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.9)'
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
        ios_share
      </span>
    </button>
  )
}
