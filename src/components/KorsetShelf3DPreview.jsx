import { useState } from 'react'
import { useI18n } from '../i18n/index.js'

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
  const { t } = useI18n()
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
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column'
      }
    : {
        position: 'relative',
        width: '100%',
        height: height,
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        background: 'var(--bg)'
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
            background: 'var(--bg-card)',
            border: '1px solid var(--glass-border)',
            borderRadius: '10px',
            color: 'var(--text)',
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title={t(isFullscreen ? 'home.shelfPreview.collapse' : 'home.shelfPreview.expand')}
        >
          <span>{t(isFullscreen ? 'home.shelfPreview.collapse' : 'home.shelfPreview.expand')}</span>
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
        sandbox="allow-scripts"
      />
    </div>
  )
}
