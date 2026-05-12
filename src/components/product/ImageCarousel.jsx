import { useState, useRef } from 'react'
import { useI18n } from '../../i18n/index.js'

export default function ImageCarousel({ images, fallbackEan, singleImage }) {
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
        }}
      >
        {t('product.noPhoto')}
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
    </div>
  )
}
