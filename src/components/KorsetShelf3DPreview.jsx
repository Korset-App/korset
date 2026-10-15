import { useState } from 'react'

/**
 * KorsetShelf3DPreview
 *
 * Isolated 3D / WebAR smart supermarket shelf and scanner preview for Körset (korset.app).
 * Renders in a sandboxed, high-performance WebGL environment with zero impact on main bundle.
 *
 * @param {Object} props
 * @param {string} [props.height='780px'] - Height of the 3D viewport
 * @param {string} [props.className=''] - Additional CSS classes
 */
export default function KorsetShelf3DPreview({ height = '780px', className = '' }) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev)
  }

  const containerStyle = isFullscreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        background: '#07080D',
        display: 'flex',
        flexDirection: 'column'
      }
    : {
        position: 'relative',
        width: '100%',
        height: height,
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        background: '#07080D'
      }

  return (
    <div className={`korset-shelf-3d-preview-wrapper ${className}`} style={containerStyle}>
      {/* Top Floating Control Bar */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '16px',
          zIndex: 60,
          display: 'flex',
          gap: '8px'
        }}
      >
        <button
          onClick={toggleFullscreen}
          style={{
            background: 'rgba(17, 19, 30, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            color: '#F3F4F6',
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title={isFullscreen ? 'Свернуть' : 'Развернуть на весь экран'}
        >
          <span>{isFullscreen ? '✕ Свернуть' : '⛶ Полный экран'}</span>
        </button>
      </div>

      {/* Sandboxed WebAR 3D Preview Frame */}
      <iframe
        src="/3d-preview.html"
        title="Körset WebAR 3D Smart Shelf"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
        allow="accelerometer; autoplay; camera; gyroscope; xr-spatial-tracking"
      />
    </div>
  )
}
