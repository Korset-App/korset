import { useNavigate } from 'react-router-dom'

export default function SoundSettingsScreen() {
  const navigate = useNavigate()

  return (
    <div
      className="screen"
      style={{ padding: '20px', minHeight: '100dvh', background: 'var(--bg-app)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
            padding: 0,
            marginRight: 15,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1
          style={{
            fontSize: 24,
            margin: 0,
            color: 'var(--text)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Звук и вибрация
        </h1>
      </div>
      <div className="glass-card" style={{ padding: 20 }}>
        <p style={{ color: 'var(--text-dim)' }}>Настройки звука и отклика появятся здесь.</p>
      </div>
    </div>
  )
}
