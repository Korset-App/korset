export default function Highlight({ text, q }) {
  if (!q || !q.trim() || !text) return <>{text}</>
  const regex = new RegExp(`(${q.trim()})`, 'gi')
  const parts = String(text).split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
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
