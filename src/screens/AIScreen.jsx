import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import products from '../data/products.json'
import { loadProfile } from '../utils/profile.js'

const CHIPS = [
  { id: 'why',     label: '✅ Почему подходит мне?'   },
  { id: 'cook',    label: '🍳 Как использовать?'       },
  { id: 'compare', label: '⚖️ Сравни с аналогами'     },
  { id: 'store',   label: '📦 Как хранить?'            },
]

// Build system prompt with product + profile context
function buildSystemPrompt(product, profile) {
  const specs = Object.entries(product.specs || {}).map(([k,v]) => `${k}: ${v}`).join(', ')
  const nutr = product.nutritionPer100
    ? `Белки ${product.nutritionPer100.protein}г, Жиры ${product.nutritionPer100.fat}г, Углеводы ${product.nutritionPer100.carbs}г, Ккал ${product.nutritionPer100.kcal} — ${product.nutritionBase}`
    : 'не указано'

  const profileParts = []
  if (profile?.halal || profile?.halalOnly) profileParts.push('нужен халал')
  if (profile?.allergens?.length) profileParts.push(`аллергии: ${profile.allergens.join(', ')}`)
  if (profile?.dietGoals?.length) profileParts.push(`диета: ${profile.dietGoals.join(', ')}`)
  if (profile?.priority) profileParts.push(`приоритет: ${profile.priority}`)

  return `Ты — Körset AI, умный помощник покупателя в супермаркете Казахстана. Отвечай кратко, по делу, на русском языке. Максимум 3–4 предложения. Без markdown, без списков с дефисами — пиши живым текстом.

ТОВАР: ${product.name}
Цена: ${product.priceKzt} тенге | Полка: ${product.shelf}
Категория: ${product.category} | Группа: ${product.group}
Описание: ${product.description || '—'}
Характеристики: ${specs || '—'}
КБЖУ: ${nutr}
Состав: ${product.ingredients || '—'}
Халал: ${product.halal === 'yes' ? 'да' : product.halal === 'no' ? 'нет' : 'неизвестно'}
Аллергены: ${product.allergens?.join(', ') || 'нет'}

ПРОФИЛЬ ПОКУПАТЕЛЯ: ${profileParts.length ? profileParts.join('; ') : 'не задан'}

Отвечай только на вопросы об этом конкретном товаре. Если покупатель спрашивает что-то не по теме — мягко верни к товару.`
}

function buildChipQuestion(chipId, product) {
  const map = {
    why:     `Объясни, почему товар "${product.name}" подходит или не подходит для моего профиля. Учти мои ограничения.`,
    cook:    `Как использовать "${product.name}"? Дай конкретный практический совет или рецепт.`,
    compare: `Сравни "${product.name}" с типичными аналогами на полке. Чем он лучше или хуже?`,
    store:   `Как правильно хранить "${product.name}" после покупки? Укажи условия и срок.`,
  }
  return map[chipId] || chipId
}

export default function AIScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = products.find(p => p.id === id)
  const profile = loadProfile()

  const [messages, setMessages] = useState([])  // {role: 'user'|'assistant', content: string}
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    if (!text.trim() || loading || !product) return
    setError(null)

    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY
      if (!apiKey) throw new Error('NO_KEY')

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          max_tokens: 300,
          temperature: 0.7,
          messages: [
            { role: 'system', content: buildSystemPrompt(product, profile) },
            ...newMessages,
          ],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `HTTP ${res.status}`)
      }

      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content?.trim()
      if (!reply) throw new Error('Пустой ответ')

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      if (e.message === 'NO_KEY') {
        setError('API ключ не настроен. Добавьте VITE_GROQ_API_KEY в настройках Vercel.')
      } else {
        setError(`Ошибка: ${e.message}`)
      }
      // Remove user message if failed
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  const handleChip = (chipId) => {
    if (loading) return
    sendMessage(buildChipQuestion(chipId, product))
  }

  if (!product) {
    return (
      <div className="screen" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
        <p style={{ color:'var(--text-dim)' }}>Товар не найден</p>
      </div>
    )
  }

  return (
    <div className="screen" style={{ display:'flex', flexDirection:'column', paddingBottom:0 }}>
      {/* Header */}
      <div className="header">
        <button className="back-btn" onClick={() => navigate(`/product/${id}`)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          К товару
        </button>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div className="screen-title">AI-помощник</div>
            <div style={{ fontSize:12, color:'var(--text-dim)', marginTop:2 }}>{product.name}</div>
          </div>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--primary-dim)', border:'1px solid rgba(139,92,246,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
            🤖
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 20px', display:'flex', flexDirection:'column', gap:12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign:'center', padding:'32px 16px 0', color:'var(--text-dim)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🤖</div>
            <p style={{ fontSize:15, fontWeight:500, color:'var(--text)' }}>Спросите про этот товар</p>
            <p style={{ fontSize:13, marginTop:6, lineHeight:1.6 }}>
              Состав, хранение, польза, сравнение с аналогами — отвечу на любой вопрос
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display:'flex', justifyContent: msg.role==='user' ? 'flex-end' : 'flex-start', animation:'slideUp 0.2s ease' }}>
            {msg.role === 'user' ? (
              <div style={{ background:'var(--primary)', color:'white', padding:'10px 14px', borderRadius:'16px 16px 4px 16px', maxWidth:'78%', fontSize:14, lineHeight:1.6, boxShadow:'0 2px 12px var(--primary-glow)' }}>
                {msg.content}
              </div>
            ) : (
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', padding:'12px 14px', borderRadius:'4px 16px 16px 16px', maxWidth:'88%', fontSize:14, lineHeight:1.7, color:'var(--text)' }}>
                <div style={{ fontSize:11, color:'var(--primary-bright)', fontWeight:700, marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
                  <span>🤖</span> Körset AI
                </div>
                {msg.content}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display:'flex', justifyContent:'flex-start', animation:'slideUp 0.2s ease' }}>
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', padding:'14px 16px', borderRadius:'4px 16px 16px 16px' }}>
              <div className="ai-typing">
                <div className="ai-dot"/><div className="ai-dot"/><div className="ai-dot"/>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:12, padding:'12px 14px', fontSize:13, color:'#F87171', lineHeight:1.6 }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ padding:'10px 16px 16px', background:'rgba(12,12,24,0.97)', borderTop:'1px solid var(--border)', backdropFilter:'blur(20px)' }}>
        {/* Quick chips */}
        <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:10, scrollbarWidth:'none' }}>
          {CHIPS.map(chip => (
            <button key={chip.id} onClick={() => handleChip(chip.id)} disabled={loading}
              style={{ flexShrink:0, padding:'7px 12px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', border:'1px solid var(--border)', background:'var(--card)', color:'var(--text-sub)', fontFamily:'var(--font-body)', opacity: loading ? 0.5 : 1, whiteSpace:'nowrap' }}>
              {chip.label}
            </button>
          ))}
        </div>

        {/* Text input */}
        <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            placeholder="Задайте вопрос о товаре..."
            disabled={loading}
            style={{ flex:1, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'11px 14px', fontSize:14, color:'var(--text)', fontFamily:'var(--font-body)', outline:'none' }}
          />
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
            style={{ width:44, height:44, borderRadius:'50%', background:input.trim() ? 'var(--primary)' : 'var(--card)', border:'none', cursor:input.trim() ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.2s', opacity: loading ? 0.5 : 1 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
