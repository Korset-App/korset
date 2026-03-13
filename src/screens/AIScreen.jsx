import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import products from '../data/products.json'
import { loadProfile } from '../utils/profile.js'

const CHIPS = [
  { id: 'why',     label: 'Почему подходит?' },
  { id: 'cook',    label: 'Как использовать?' },
  { id: 'compare', label: 'Сравни с аналогами' },
  { id: 'store',   label: 'Как хранить?' },
]

function buildSystemPrompt(product, profile) {
  const specs = Object.entries(product.specs || {}).map(([k,v]) => `${k}: ${v}`).join(', ')
  const nutr = product.nutritionPer100
    ? `Белки ${product.nutritionPer100.protein}г, Жиры ${product.nutritionPer100.fat}г, Углеводы ${product.nutritionPer100.carbs}г, Ккал ${product.nutritionPer100.kcal}`
    : 'не указано'
  const profileParts = []
  if (profile?.halal || profile?.halalOnly) profileParts.push('нужен халал')
  if (profile?.allergens?.length) profileParts.push(`аллергии: ${profile.allergens.join(', ')}`)
  if (profile?.dietGoals?.length) profileParts.push(`диета: ${profile.dietGoals.join(', ')}`)
  return `Ты — Körset AI, умный помощник покупателя в супермаркете Казахстана. Отвечай кратко, по делу, на русском языке. Максимум 3–4 предложения. Без markdown — пиши живым текстом как друг.

ТОВАР: ${product.name} | Цена: ${product.priceKzt}₸ | Полка: ${product.shelf}
КБЖУ: ${nutr} | Состав: ${product.ingredients || '—'}
Халал: ${product.halal === 'yes' ? 'да' : product.halal === 'no' ? 'нет' : 'неизвестно'}
Аллергены: ${product.allergens?.join(', ') || 'нет'}
ПРОФИЛЬ: ${profileParts.length ? profileParts.join('; ') : 'не задан'}`
}

function buildExternalSystemPrompt(product, profile) {
  const n = product.nutrition
  const nutrStr = n ? `Белки ${n.protein ?? '—'}г, Жиры ${n.fat ?? '—'}г, Углеводы ${n.carbs ?? '—'}г, Ккал ${n.calories ?? '—'}` : 'не указано'
  const profileParts = []
  if (profile?.halal || profile?.halalOnly) profileParts.push('нужен халал')
  if (profile?.allergens?.length) profileParts.push(`аллергии: ${profile.allergens.join(', ')}`)
  if (profile?.dietGoals?.length) profileParts.push(`диета: ${profile.dietGoals.join(', ')}`)
  return `Ты — Körset AI, умный помощник покупателя в супермаркете Казахстана. Отвечай кратко, по делу, на русском языке. Максимум 3–4 предложения. Без markdown — пиши живым текстом как друг.

ТОВАР: ${product.name} | Бренд: ${product.brand || '—'}
КБЖУ: ${nutrStr} | Состав: ${product.ingredients || '—'}
Халал: ${product.isHalal === true ? 'да' : 'неизвестно'} | Аллергены: ${product.allergens?.join(', ') || 'нет'}
Nutri-Score: ${product.nutriscore?.toUpperCase() || '—'}
ПРОФИЛЬ: ${profileParts.length ? profileParts.join('; ') : 'не задан'}`
}

function buildChipQuestion(chipId, product) {
  const map = {
    why:     `Объясни, почему "${product.name}" подходит или не подходит для моего профиля.`,
    cook:    `Как использовать "${product.name}"? Дай практический совет.`,
    compare: `Сравни "${product.name}" с типичными аналогами. Чем лучше или хуже?`,
    store:   `Как хранить "${product.name}" после покупки?`,
  }
  return map[chipId] || chipId
}

// Иконка-аватар Körset
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

export default function AIScreen() {
  const { id, ean } = useParams()
  const navigate = useNavigate()
  const { state: navState } = useLocation()
  const profile = loadProfile()
  const isExternal = Boolean(ean)
  const product = isExternal
    ? (navState?.product ?? null)
    : products.find(p => p.id === id)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          max_tokens: 300, temperature: 0.7,
          messages: [
            { role: 'system', content: isExternal ? buildExternalSystemPrompt(product, profile) : buildSystemPrompt(product, profile) },
            ...newMessages,
          ],
        }),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error?.message || `HTTP ${res.status}`) }
      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content?.trim()
      if (!reply) throw new Error('Пустой ответ')
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      if (e.message === 'NO_KEY') setError('API ключ не настроен.')
      else setError(`Ошибка: ${e.message}`)
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  if (!product) {
    return (
      <div className="screen" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
        <p style={{ color:'var(--text-dim)' }}>Товар не найден</p>
      </div>
    )
  }

  const productImage = product.image || product.images?.[0] || null

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--bg)', display:'flex', flexDirection:'column' }}>

      {/* ── Хедер: назад + "Körset AI" + статус ── */}
      <div style={{
        padding: '52px 20px 14px',
        background: 'var(--bg)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        {/* Кнопка назад */}
        <button
          onClick={() => isExternal
            ? navigate(`/product/ext/${ean}`, { replace: true, state: { product } })
            : navigate(`/product/${id}`, { replace: true })
          }
          style={{
            width: 38, height: 38, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>

        {/* Аватар */}
        <KorsetAvatar size={38} />

        {/* Имя + статус */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>
            Körset AI
          </div>
          <div style={{ fontSize: 12, color: '#34D399', fontWeight: 500, marginTop: 1 }}>
            Онлайн
          </div>
        </div>
      </div>

      {/* ── Контекст товара ── */}
      <div style={{
        margin: '12px 16px 4px',
        padding: '10px 14px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
      }}>
        {/* Фото */}
        <div style={{
          width: 42, height: 42, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
          background: 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {productImage
            ? <img src={productImage} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            : <span style={{ fontSize: 22 }}>🛍️</span>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 2 }}>
            Контекст продукта
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {product.name}
          </div>
        </div>
      </div>

      {/* ── Сообщения ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Пустое состояние */}
        {messages.length === 0 && (
          <div style={{ padding: '24px 0 8px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <KorsetAvatar size={34} />
            <div style={{
              background: '#151525', border: '1px solid rgba(255,255,255,0.08)',
              padding: '13px 16px', borderRadius: '4px 18px 18px 18px',
              maxWidth: '85%', fontSize: 15, lineHeight: 1.65, color: 'rgba(255,255,255,0.85)',
            }}>
              Привет! Задайте любой вопрос про <strong style={{ color: '#fff' }}>{product.name}</strong> — состав, аллергены, как использовать или сравнить с аналогами.
            </div>
          </div>
        )}

        {/* Переписка */}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            alignItems: 'flex-end',
            gap: 10,
          }}>
            {/* Аватар AI слева */}
            {msg.role === 'assistant' && <KorsetAvatar size={34} />}

            <div style={msg.role === 'user' ? {
              background: '#7C3AED',
              padding: '12px 16px',
              borderRadius: '18px 18px 4px 18px',
              maxWidth: '78%',
              fontSize: 15, lineHeight: 1.65, color: '#fff',
              boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
            } : {
              background: '#151525',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '13px 16px',
              borderRadius: '4px 18px 18px 18px',
              maxWidth: '85%',
              fontSize: 15, lineHeight: 1.65,
              color: 'rgba(255,255,255,0.85)',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Индикатор печатает */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <KorsetAvatar size={34} />
            <div style={{
              background: '#151525', border: '1px solid rgba(255,255,255,0.08)',
              padding: '14px 18px', borderRadius: '4px 18px 18px 18px',
            }}>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'rgba(167,139,250,0.7)',
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}/>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#F87171' }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Поле ввода ── */}
      <div style={{
        padding: '10px 16px 32px',
        background: '#0C0C18',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        {/* Быстрые вопросы */}
        {messages.length === 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
            {CHIPS.map(chip => (
              <button key={chip.id} onClick={() => sendMessage(buildChipQuestion(chip.id, product))} disabled={loading}
                style={{
                  flexShrink: 0, padding: '7px 14px', borderRadius: 20,
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.7)',
                  fontFamily: 'var(--font-body)',
                  whiteSpace: 'nowrap',
                }}>
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Инпут */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            placeholder="Спросить о продукте..."
            disabled={loading}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 24,
              padding: '13px 18px',
              fontSize: 15,
              color: '#fff',
              fontFamily: 'var(--font-body)',
              outline: 'none',
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{
              width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              background: input.trim() ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' : 'rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: input.trim() ? '0 4px 16px rgba(124,58,237,0.4)' : 'none',
              transition: 'all 0.2s ease',
            }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0) }
          30% { transform: translateY(-6px) }
        }
      `}</style>
    </div>
  )
}
