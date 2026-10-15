import { escapeLiteralPattern } from '../../../utils/literalSearch.js'

export default function Highlight({ text, q, query }) {
  const search = q ?? query
  if (!search || !search.trim() || !text) return <>{text}</>
  const regex = new RegExp(`(${escapeLiteralPattern(search.trim())})`, 'gi')
  const parts = String(text).split(regex)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span
            key={i}
            style={{
              backgroundColor: 'rgba(56,189,248,0.25)',
              color: '#38BDF8',
              borderRadius: 3,
              padding: '0 2px',
            }}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}
