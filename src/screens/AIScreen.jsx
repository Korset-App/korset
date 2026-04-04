
import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useStoreId } from '../contexts/StoreContext.jsx'
import { useI18n } from '../utils/i18n.js'
import KorsetAvatar from '../components/KorsetAvatar.jsx'
import { askProductAI } from '../services/ai.js'
import { resolveProductByRef } from '../domain/product/resolver.js'
import { coerceProductEntity } from '../domain/product/normalizers.js'

function getChips(t) {
  return [
    { id: 'why', label: t.ai.chips.why },
    { id: 'cook', label: t.ai.chips.cook },
    { id: 'compare', label: t.ai.chips.compare },
    { id: 'store', label: t.ai.chips.store },
  ]
}

function buildChipQuestion(chipId, product, t) {
  const fn = t.ai.chipQuestions[chipId]
  return fn ? fn(product.name) : chipId
}

export default function AIScreen() {
  const { id, ean } = useParams()
  const navigate = useNavigate()
  const { state: navState } = useLocation()
  const { profile } = useProfile()
  const { lang, t } = useI18n()
  const storeId = useStoreId()

  const [product, setProduct] = useState(navState?.product ? coerceProductEntity(navState.product) : null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    if (product) return undefined

    async function loadProduct() {
      const nextProduct = await resolveProductByRef(ean ? { ean } : { canonicalId: id }, storeId)
      if (!cancelled) setProduct(nextProduct)
    }

    loadProduct()
    return () => { cancelled = true }
  }, [id, ean, storeId, product])

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
      const reply = await askProductAI(newMessages, product, profile, lang)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(`${t.ai.errorPrefix} ${err.message}`)
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  if (!product) {
    return (
      <div className="screen" style={{ display: 'grid', placeItems: 'center' }}>
        <p style={{ color: 'var(--text-dim)' }}>{t.common.loading}</p>
      </div>
    )
  }

  const productImage = product.image || product.images?.[0] || null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 20px 14px', background: 'var(--bg)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button
          onClick={() => navigate(`/product/${encodeURIComponent(product.canonicalId)}`, { replace: true, state: { product } })}
          style={{ width: 38, height: 38, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <KorsetAvatar size={38} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>Körset AI</div>
          <div style={{ fontSize: 12, color: '#34D399', fontWeight: 500, marginTop: 1 }}>{t.common.online}</div>
        </div>
      </div>

      <div style={{ margin: '12px 16px 4px', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {productImage ? <img src={productImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <span style={{ fontSize: 22 }}>🛍️</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 2 }}>{t.ai.productContext}</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)', padding: '10px 14px', borderRadius: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div style={{ fontSize: 11, color: '#FDE68A', lineHeight: 1.4, opacity: 0.9 }}>
            {lang === 'kz' ? 'Ескерту: Жасанды интеллект қателесуі мүмкін. Құрамды әрқашан қаптамадан тексеріңіз.' : 'Внимание: ИИ может ошибаться. Всегда проверяйте состав на упаковке.'}
          </div>
        </div>

        {messages.length === 0 && (
          <div style={{ padding: '24px 0 8px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <KorsetAvatar size={34} />
            <div style={{ background: '#151525', border: '1px solid rgba(255,255,255,0.08)', padding: '13px 16px', borderRadius: '4px 18px 18px 18px', maxWidth: '85%', fontSize: 15, lineHeight: 1.65, color: 'rgba(255,255,255,0.85)' }}>
              {t.ai.welcomeProduct} <strong style={{ color: '#fff' }}>{product.name}</strong> {t.ai.welcomeProductEnd}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 10 }}>
            {msg.role === 'assistant' && <KorsetAvatar size={34} />}
            <div style={{
              background: msg.role === 'user' ? 'linear-gradient(135deg, rgba(124,58,237,0.95), rgba(91,33,182,0.95))' : '#151525',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
              padding: '12px 14px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
              maxWidth: '82%',
              color: '#fff',
              fontSize: 14,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <KorsetAvatar size={34} />
            <div style={{ background: '#151525', border: '1px solid rgba(255,255,255,0.08)', padding: '12px 14px', borderRadius: '4px 18px 18px 18px', color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
              {lang === 'kz' ? 'Жауап дайындап жатырмын...' : 'Думаю над ответом...'}
            </div>
          </div>
        )}

        {error && <div style={{ color: '#FCA5A5', fontSize: 13 }}>{error}</div>}

        {messages.length === 0 && !loading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {getChips(t).map((chip) => (
              <button key={chip.id} onClick={() => sendMessage(buildChipQuestion(chip.id, product, t))} style={{ padding: '10px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#E8E8FF', fontSize: 13, cursor: 'pointer' }}>
                {chip.label}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 16px 18px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder={t.ai.inputProduct} style={{ flex: 1, resize: 'none', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', padding: '12px 14px', fontSize: 14, minHeight: 48, maxHeight: 120 }} />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} style={{ minWidth: 48, height: 48, borderRadius: 16, border: 'none', background: input.trim() && !loading ? '#7C3AED' : 'rgba(255,255,255,0.08)', color: '#fff', cursor: input.trim() && !loading ? 'pointer' : 'default' }}>➜</button>
        </div>
      </div>
    </div>
  )
}
