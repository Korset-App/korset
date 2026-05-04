import { useEffect, useRef, useState } from 'react'

/**
 * SegmentedToggle — accessible iOS-style segmented control with a sliding
 * thumb that animates between options. Used for both the RU/KZ language
 * toggle and the Light/Dark theme toggle on the profile screen, so both
 * controls are visually identical (same paddings, same animation, same
 * "feel").
 *
 * Props:
 *   options    {Array<{ key, render(active): ReactNode }>}
 *              `render(active)` lets each option swap its visual when
 *              active vs. inactive (used to flip outline ↔ filled icons
 *              on the theme toggle).
 *   activeKey  {string}  — currently selected option key
 *   onChange   {(key) => void}
 *   ariaLabel  {string}  — group label for screen readers
 *
 * Implementation notes:
 *   • Thumb is a single absolutely-positioned element transformed via
 *     translateX, so the GPU handles the motion (60+ fps, no layout
 *     thrashing).
 *   • We measure each button on resize so the thumb is always exactly
 *     the right width even when content (RU/KZ) and content (icons) end
 *     up with slightly different intrinsic widths.
 *   • Spring-like cubic-bezier on the thumb gives a small overshoot,
 *     matching how iOS / iPad segmented controls feel.
 */
export default function SegmentedToggle({ options, activeKey, onChange, ariaLabel }) {
  const containerRef = useRef(null)
  const buttonRefs = useRef({})
  const [thumbStyle, setThumbStyle] = useState({ left: 0, width: 0 })

  // Measure the active button position whenever it changes (or on resize)
  // so the thumb tracks it pixel-perfectly even if labels are different
  // widths. Using getBoundingClientRect lets us be precise without making
  // any assumptions about the segments having equal width.
  useEffect(() => {
    const measure = () => {
      const container = containerRef.current
      const btn = buttonRefs.current[activeKey]
      if (!container || !btn) return
      const cRect = container.getBoundingClientRect()
      const bRect = btn.getBoundingClientRect()
      setThumbStyle({
        left: bRect.left - cRect.left,
        width: bRect.width,
      })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeKey, options])

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={ariaLabel}
      style={{
        position: 'relative',
        display: 'inline-flex',
        background: 'var(--glass-subtle)',
        borderRadius: 12,
        padding: 3,
        gap: 0,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Sliding thumb — animated background pill */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: 0,
          width: thumbStyle.width,
          transform: `translateX(${thumbStyle.left}px)`,
          background: 'var(--primary)',
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(124, 58, 237, 0.32), 0 1px 0 rgba(255,255,255,0.18) inset',
          // Spring cubic-bezier — small overshoot for a "snappy iOS" feel.
          transition:
            'transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform, width',
        }}
      />
      {options.map((opt) => {
        const isActive = opt.key === activeKey
        return (
          <button
            key={opt.key}
            ref={(el) => {
              buttonRefs.current[opt.key] = el
            }}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (!isActive) onChange(opt.key)
            }}
            aria-pressed={isActive}
            aria-label={opt.ariaLabel}
            title={opt.title || opt.ariaLabel}
            style={{
              position: 'relative',
              zIndex: 1,
              background: 'transparent',
              border: 'none',
              color: isActive ? '#fff' : 'var(--text-sub)',
              padding: '0 14px',
              height: 28,
              minWidth: 50,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.4,
              fontFamily: 'var(--font-display)',
              cursor: isActive ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
              outline: 'none',
            }}
          >
            {opt.render ? opt.render(isActive) : opt.label}
          </button>
        )
      })}
    </div>
  )
}
