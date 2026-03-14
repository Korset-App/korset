import { useState, useRef, useEffect } from 'react'

const CHIPS = [
  { label: 'Что приготовить?' },
  { label: 'Халал товары' },
  { label: 'Без глютена' },
  { label: 'Дешевле 500₸' },
]

const SYSTEM_PROMPT = `Ты — Körset AI, умный помощник покупателя в супермаркете Казахстана. 
Помогаешь найти товары, отвечаешь на вопросы про состав и питание, советуешь рецепты и альтернативы.
Отвечай кратко, по делу, на русском языке. Максимум 4 предложения. Без markdown — пиши живым текстом как друг.
Если спрашивают про конкретный товар которого нет в контексте — предложи его отсканировать.`

function KorsetAvatar({ size = 34 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 10px rgba(124,58,237,0.4)',
      padding: size * 0.18,
    }}>
      <img src="/icon_logo.svg" alt="Körset" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  )
}

export default function GeneralAIScreen() {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return
    const userMsg    = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY
      if (!apiKey) throw new Error('NO_KEY')
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          max_tokens: 300, temperature: 0.7,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...newMessages],
        }),
      })
      const data  = await res.json()
      const reply = data.choices?.[0]?.message?.content?.trim()
      if (reply) setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Не удалось получить ответ. Проверьте подключение.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Хедер */}
      <div style={{
        padding: '52px 20px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <KorsetAvatar size={38} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>Körset AI</div>
          <div style={{ fontSize: 12, color: '#34D399', fontWeight: 500 }}>Онлайн</div>
        </div>
      </div>

      {/* Сообщения */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.length === 0 && (
          <div style={{ padding: '20px 0 8px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <KorsetAvatar size={34} />
            <div style={{
              background: '#151525', border: '1px solid rgba(255,255,255,0.08)',
              padding: '13px 16px', borderRadius: '4px 18px 18px 18px',
              maxWidth: '85%', fontSize: 15, lineHeight: 1.65, color: 'rgba(255,255,255,0.85)',
            }}>
              Привет! Спросите про любой товар, рецепт или диету. Я помогу найти что нужно в магазине 🛒
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 10 }}>
            {msg.role === 'assistant' && <KorsetAvatar size={34} />}
            <div style={msg.role === 'user' ? {
              background: '#7C3AED', padding: '12px 16px',
              borderRadius: '18px 18px 4px 18px', maxWidth: '78%',
              fontSize: 15, lineHeight: 1.65, color: '#fff',
              boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
            } : {
              background: '#151525', border: '1px solid rgba(255,255,255,0.08)',
              padding: '13px 16px', borderRadius: '4px 18px 18px 18px',
              maxWidth: '85%', fontSize: 15, lineHeight: 1.65,
              color: 'rgba(255,255,255,0.85)',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <KorsetAvatar size={34} />
            <div style={{ background: '#151525', border: '1px solid rgba(255,255,255,0.08)', padding: '14px 18px', borderRadius: '4px 18px 18px 18px' }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(167,139,250,0.7)', animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }}/>
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Инпут */}
      <div style={{ padding: '10px 16px 16px', marginBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))', background: '#0C0C18', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
            {CHIPS.map((c, i) => (
              <button key={i} onClick={() => sendMessage(c.label)} style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: 20,
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.7)',
                fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
              }}>
                {c.label}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            placeholder="Спросить о товаре или рецепте..."
            style={{
              flex: 1, background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 24, padding: '13px 18px',
              fontSize: 15, color: '#fff',
              fontFamily: 'var(--font-body)', outline: 'none',
            }}
          />
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} style={{
            width: 48, height: 48, borderRadius: '50%', border: 'none',
            cursor: input.trim() ? 'pointer' : 'default',
            background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
            transition: 'all 0.2s ease', flexShrink: 0,
            opacity: loading || !input.trim() ? 0.6 : 1,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
      `}</style>
    </div>
  )
}
