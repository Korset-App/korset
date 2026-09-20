import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../../i18n/index.js'
import { ShareIcon, CloseIcon } from '../icons/index.js'

function LightboxModal({ images, initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const startDistanceRef = useRef(null)
  const startPosRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const [isDragging, setIsDragging] = useState(false)

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      startDistanceRef.current = dist
      setIsDragging(true)
    } else if (e.touches.length === 1 && scale > 1) {
      startPosRef.current = {
        touchX: e.touches[0].clientX,
        touchY: e.touches[0].clientY,
        posX: pos.x,
        posY: pos.y,
      }
      setIsDragging(true)
    }
  }

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && startDistanceRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const factor = dist / startDistanceRef.current
      setScale((prev) => Math.min(Math.max(prev * factor, 1), 4))
      startDistanceRef.current = dist
    } else if (e.touches.length === 1 && scale > 1 && startPosRef.current) {
      const dx = e.touches[0].clientX - startPosRef.current.touchX
      const dy = e.touches[0].clientY - startPosRef.current.touchY
      setPos({
        x: startPosRef.current.posX + dx,
        y: startPosRef.current.posY + dy,
      })
    }
  }

  const handleTouchEnd = () => {
    startDistanceRef.current = null
    startPosRef.current = null
    setIsDragging(false)
    if (scale <= 1) {
      setPos({ x: 0, y: 0 })
    }
  }

  const handleDoubleTap = () => {
    if (scale > 1) {
      setScale(1)
      setPos({ x: 0, y: 0 })
    } else {
      setScale(2.2)
    }
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.94)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        touchAction: scale > 1 ? 'none' : 'pan-y',
      }}
      onClick={scale === 1 ? onClose : undefined}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'calc(16px + env(safe-area-inset-top, 0px)) 20px 12px',
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          style={{
            color: 'rgba(255, 255, 255, 0.75)',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'monospace',
          }}
        >
          {index + 1} / {images.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.15)',
            border: 'none',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <CloseIcon size={20} />
        </button>
      </div>

      {/* Image container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleTap}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={images[index]}
          alt=""
          style={{
            maxWidth: '96%',
            maxHeight: '85vh',
            objectFit: 'contain',
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.2s ease',
            cursor: scale > 1 ? 'grab' : 'zoom-in',
          }}
          draggable={false}
        />
      </div>

      {/* Bottom Thumbnail Bar / Switcher if > 1 image */}
      {images.length > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            padding: '12px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
            zIndex: 10,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setIndex(i)
                setScale(1)
                setPos({ x: 0, y: 0 })
              }}
              style={{
                width: 52,
                height: 52,
                borderRadius: 10,
                border: index === i ? '2px solid #fff' : '2px solid rgba(255, 255, 255, 0.25)',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: 3,
                cursor: 'pointer',
                overflow: 'hidden',
                opacity: index === i ? 1 : 0.6,
                transition: 'opacity 0.2s, border-color 0.2s',
              }}
            >
              <img
                src={src}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </button>
          ))}
        </div>
      )}
    </motion.div>,
    document.body
  )
}

export default function ImageCarousel({ images, fallbackEan, singleImage, onShare, shareLabel }) {
  const { t } = useI18n()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
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
          height: 300,
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
        {onShare && <ShareActions onShare={onShare} shareLabel={shareLabel} />}
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
    <>
      <div
        className="catalog-img-box"
        style={{
          position: 'relative',
          width: '100%',
          height: 300,
          borderRadius: 20,
          cursor: 'pointer',
        }}
        onClick={() => setIsLightboxOpen(true)}
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
                padding: '8px 12px', // fills 94-96% of frame height nicely
              }}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          ))}
        </div>

        {/* Enhanced High-Contrast Indicators */}
        {finalImages.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 12,
              background: 'rgba(0, 0, 0, 0.42)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              zIndex: 3,
            }}
          >
            {finalImages.map((_, i) => (
              <div
                key={i}
                style={{
                  width: currentIndex === i ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: currentIndex === i ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                  transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
              />
            ))}
          </div>
        )}

        {onShare && <ShareActions onShare={onShare} shareLabel={shareLabel} />}
      </div>

      {/* Fullscreen Zoomable Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <LightboxModal
            images={finalImages}
            initialIndex={currentIndex}
            onClose={() => setIsLightboxOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// Single-button overlay: share icon (ios_share).
function ShareActions({ onShare, shareLabel }) {
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
        <ShareIcon size={17} />
      </button>
    </div>
  )
}
