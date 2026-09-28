import { memo, useMemo } from 'react'
import { getSearchHighlightSegments } from '../../domain/product/searchHighlight.js'

function HighlightMatchComponent({ text, query }) {
  const segments = useMemo(() => getSearchHighlightSegments(text, query), [text, query])

  if (!segments || segments.length === 0) return text || null
  if (segments.length === 1 && !segments[0].match) return text

  return (
    <>
      {segments.map((seg, i) =>
        seg.match ? (
          <mark key={i} className="search-highlight">
            {seg.text}
          </mark>
        ) : (
          seg.text
        )
      )}
    </>
  )
}

export const HighlightMatch = memo(HighlightMatchComponent)
