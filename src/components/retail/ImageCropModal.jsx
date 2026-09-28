import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n/index.js'
import { CloseIcon, CheckCircleIcon } from '../icons/index.js'

const VIEWPORT_SIZE = 260
const OUTPUT_SIZE = 512

export default function ImageCropModal({ isOpen, imageSrc, onConfirm, onClose }) {
  const { lang, t } = useI18n()
  const isKz = lang === 'kz'

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const panStartRef = useRef({ x: 0, y: 0 })
  const imgRef = useRef(null)
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target
    setNaturalSize({ width: naturalWidth, height: naturalHeight })
  }

  // Pointer drag for mouse and touch
  const handlePointerDown = (e) => {
    isDraggingRef.current = true
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    dragStartRef.current = { x: clientX, y: clientY }
    panStartRef.current = { ...pan }
  }

  const handlePointerMove = useCallback((e) => {
    if (!isDraggingRef.current) return
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    const dx = clientX - dragStartRef.current.x
    const dy = clientY - dragStartRef.current.y
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    })
  }, [])

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  useEffect(() => {
    const onMove = (e) => handlePointerMove(e)
    const onUp = () => handlePointerUp()
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [handlePointerMove, handlePointerUp])

  const handleSave = () => {
    const img = imgRef.current
    if (!img || !naturalSize.width || !naturalSize.height) return

    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scale = OUTPUT_SIZE / VIEWPORT_SIZE
    const aspect = naturalSize.width / naturalSize.height

    let baseW, baseH
    if (aspect >= 1) {
      baseH = VIEWPORT_SIZE * zoom
      baseW = baseH * aspect
    } else {
      baseW = VIEWPORT_SIZE * zoom
      baseH = baseW / aspect
    }

    const drawX = (VIEWPORT_SIZE - baseW) / 2 + pan.x
    const drawY = (VIEWPORT_SIZE - baseH) / 2 + pan.y

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
    ctx.drawImage(img, drawX * scale, drawY * scale, baseW * scale, baseH * scale)

    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob)
      },
      'image/webp',
      0.9
    )
  }

  if (!isOpen || !imageSrc) return null

  const aspect =
    naturalSize.width && naturalSize.height ? naturalSize.width / naturalSize.height : 1
  let imgDisplayWidth, imgDisplayHeight
  if (aspect >= 1) {
    imgDisplayHeight = VIEWPORT_SIZE * zoom
    imgDisplayWidth = imgDisplayHeight * aspect
  } else {
    imgDisplayWidth = VIEWPORT_SIZE * zoom
    imgDisplayHeight = imgDisplayWidth / aspect
  }

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box',
        background: 'rgba(5, 10, 20, 0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 22,
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card, 0 24px 64px rgba(0, 0, 0, 0.65))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.06) 0%, transparent 100%)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {isKz ? 'Логотипті реттеу' : 'Настройка логотипа'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              {isKz
                ? 'Суретті жылжытыңыз және масштабты өзгертіңіз'
                : 'Перетащите изображение и настройте масштаб'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-sub)',
              cursor: 'pointer',
            }}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Viewport Frame */}
        <div
          style={{
            padding: '24px 20px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.25)',
          }}
        >
          <div
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            style={{
              width: VIEWPORT_SIZE,
              height: VIEWPORT_SIZE,
              borderRadius: 24,
              border: '2px solid var(--retail-accent, #38bdf8)',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 8px 32px rgba(0,0,0,0.5)',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'grab',
              userSelect: 'none',
              touchAction: 'none',
              background: '#0f172a',
            }}
          >
            {/* Image */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop target"
              onLoad={handleImageLoad}
              draggable={false}
              style={{
                position: 'absolute',
                left: (VIEWPORT_SIZE - imgDisplayWidth) / 2 + pan.x,
                top: (VIEWPORT_SIZE - imgDisplayHeight) / 2 + pan.y,
                width: imgDisplayWidth,
                height: imgDisplayHeight,
                maxWidth: 'none',
                maxHeight: 'none',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />

            {/* 3x3 Rule-of-thirds grid */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gridTemplateRows: '1fr 1fr 1fr',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div
                style={{
                  borderRight: '1px dashed rgba(255, 255, 255, 0.25)',
                  borderBottom: '1px dashed rgba(255, 255, 255, 0.25)',
                }}
              />
              <div
                style={{
                  borderRight: '1px dashed rgba(255, 255, 255, 0.25)',
                  borderBottom: '1px dashed rgba(255, 255, 255, 0.25)',
                }}
              />
              <div style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.25)' }} />
              <div
                style={{
                  borderRight: '1px dashed rgba(255, 255, 255, 0.25)',
                  borderBottom: '1px dashed rgba(255, 255, 255, 0.25)',
                }}
              />
              <div
                style={{
                  borderRight: '1px dashed rgba(255, 255, 255, 0.25)',
                  borderBottom: '1px dashed rgba(255, 255, 255, 0.25)',
                }}
              />
              <div style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.25)' }} />
              <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.25)' }} />
              <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.25)' }} />
              <div />
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 12 }}>
            {isKz ? 'Сүйреп орналастырыңыз' : 'Зажмите и двигайте для точного кадрирования'}
          </div>
        </div>

        {/* Zoom Controls */}
        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)' }}>
              {isKz ? 'Масштаб' : 'Масштаб'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--retail-accent, #38bdf8)' }}>
              {Math.round(zoom * 100)}%
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              −
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{
                flex: 1,
                accentColor: 'var(--retail-accent, #38bdf8)',
                cursor: 'pointer',
              }}
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 18px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 10,
            background: 'var(--surface)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 10,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('common.cancel') || 'Отмена'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              flex: 1.4,
              padding: '10px 14px',
              borderRadius: 10,
              background: 'var(--retail-accent, #38bdf8)',
              border: 'none',
              color: '#07070F',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: '0 4px 16px rgba(56, 189, 248, 0.3)',
            }}
          >
            <CheckCircleIcon size={16} />
            <span>{isKz ? 'Сақтау' : 'Применить и сохранить'}</span>
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
