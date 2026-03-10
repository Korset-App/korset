import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import products from '../data/products.json'
import { getMockAIResponse } from '../utils/mockAI.js'

const CHIP_LABELS = [
  { id: 'cook', label: 'Что приготовить?', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3h16" />
      <path d="M6 3v7a6 6 0 0 0 12 0V3" />
      <path d="M8 21h8" />
    </svg>
  ) },
  { id: 'why', label: 'Почему лучше?', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17h.01" />
      <path d="M9.1 9a3 3 0 1 1 5.8 1c-.6 1.2-1.9 1.5-1.9 3" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  ) },
  { id: 'compare', label: 'Сравни варианты', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3H5a2 2 0 0 0-2 2v5" />
      <path d="M14 21h5a2 2 0 0 0 2-2v-5" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  ) },
]

export default function AIScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = products.find((p) => p.id === id)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeChip, setActiveChip] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = (text, chipId = null) => {
    if (!text.trim() && !chipId) return
    const question = chipId ? CHIP_LABELS.find((c) => c.id === chipId)?.label || text : text

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: question },
    ])
    setInput('')
    setActiveChip(chipId)
    setLoading(true)

    // Simulate AI delay
    setTimeout(() => {
      const response = getMockAIResponse(product, chipId, text)
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: response },
      ])
      setLoading(false)
    }, 1000 + Math.random() * 500)
  }

  const handleChip = (chipId) => {
    if (loading) return
    sendMessage('', chipId)
  }

  const handleSend = () => {
    if (!input.trim() || loading) return
    sendMessage(input)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="header">
        <button className="back-btn" onClick={() => navigate(`/product/${id}`)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          К товару
        </button>
        <div className="header-row">
          <div>
            <div className="screen-title">AI-помощник</div>
            {product && (
              <div className="screen-subtitle">{product.name.split('«')[0].trim()}</div>
            )}
          </div>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--primary-dim)',
            border: '1px solid rgba(139,92,246,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8V4" />
              <path d="M8 4h8" />
              <rect x="6" y="8" width="12" height="10" rx="3" />
              <path d="M10 12h.01" />
              <path d="M14 12h.01" />
              <path d="M9 18v2" />
              <path d="M15 18v2" />
            </svg>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '32px 0 16px',
            color: 'var(--text-dim)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: 'var(--primary-bright)' }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
              </svg>
            </div>
            <p style={{ fontSize: 14 }}>Задайте вопрос о товаре</p>
            <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-dim)' }}>или выберите из быстрых вопросов</p>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              animation: 'slideUp 0.25s ease both',
            }}
          >
            {msg.role === 'user' ? (
              <div style={{
                background: 'var(--primary)',
                color: 'white',
                padding: '10px 14px',
                borderRadius: '16px 16px 4px 16px',
                maxWidth: '75%',
                fontSize: 14,
                lineHeight: 1.5,
                boxShadow: '0 2px 12px var(--primary-glow)',
              }}>
                {msg.text}
              </div>
            ) : (
              <div className="ai-response" style={{ maxWidth: '90%' }}>
                <div className="ai-response-header">
                  <span style={{ width: 16, height: 16, display: 'inline-flex' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="8" width="12" height="10" rx="3" />
                      <path d="M12 8V4" />
                      <path d="M10 12h.01" />
                      <path d="M14 12h.01" />
                    </svg>
                  </span>
                  Körset AI
                </div>
                <div className="ai-response-text">{msg.text}</div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', animation: 'slideUp 0.2s ease' }}>
            <div className="ai-response" style={{ padding: '14px 16px' }}>
              <div className="ai-typing">
                <div className="ai-dot" />
                <div className="ai-dot" />
                <div className="ai-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area (sticky at bottom above nav) */}
      <div style={{
        padding: '12px 20px 16px',
        background: 'rgba(12,12,24,0.95)',
        borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Chips */}
        <div className="chip-row" style={{ marginBottom: 12 }}>
          {CHIP_LABELS.map((chip) => (
            <button
              key={chip.id}
              className={`chip ${activeChip === chip.id ? 'active' : ''}`}
              onClick={() => handleChip(chip.id)}
              disabled={loading}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: activeChip === chip.id ? 'var(--primary-bright)' : 'var(--text-dim)', display: 'inline-flex' }}>{chip.icon}</span>
                {chip.label}
              </span>
            </button>
          ))}
        </div>

        {/* Input row */}
        <div className="ai-input-row">
          <input
            className="ai-input"
            placeholder="Задайте вопрос..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
          />
          <button
            className="ai-send-btn"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{ opacity: loading || !input.trim() ? 0.5 : 1 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
