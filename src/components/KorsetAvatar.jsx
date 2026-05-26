// Shared AI avatar — used in AIScreen, AIAssistantScreen

export default function KorsetAvatar({ size = 34 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 10px rgba(124,58,237,0.4)',
        padding: size * 0.18,
      }}
    >
      <img
        src="/brand/korset-icon.svg"
        alt="Körset"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  )
}
