import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useI18n } from '../utils/i18n.js'
import { useOffline } from '../contexts/OfflineContext.jsx'
import KorsetAvatar from '../components/KorsetAvatar.jsx'
import { askProductAI } from '../services/ai.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { getAnyKnownProductByRef } from '../utils/storeCatalog.js'
import { buildProductPath } from '../utils/routes.js'

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
  const { ean, storeSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { state: navState } = location
  const { profile } = useProfile()
  const { lang, t } = useI18n()
  const { currentStore } = useStore()
  const { isOnline } = useOffline()
  const activeStoreSlug = storeSlug || currentStore?.slug || null
  const isExternal = location.pathname.includes('/product/ext/')
  const product = isExternal
    ? (navState?.product ?? null)
    : getAnyKnownProductByRef(ean, activeStoreSlug)

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
      const reply = await askProductAI(newMessages, product, profile, lang)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(`${t.ai.errorPrefix} ${e.message}`)
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  if (!product) {
    return (
      <div
        className="screen"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <p style={{ color: 'var(--text-dim)' }}>{t.common.notFound}</p>
      </div>
    )
  }

  if (!isOnline) {
    return (
      <div
        className="screen"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          padding: 40,
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }}
        >
          cloud_off
        </span>
        <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 14 }}>
          {lang === 'kz'
            ? 'Желі қосылуынсыз ИИ көмекші қол жеткізбейді'
            : 'ИИ-ассистент недоступен без интернета'}
        </p>
      </div>
    )
  }

  const productImage = product.image || product.images?.[0] || null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Хедер: назад + "Körset AI" + статус ── */}
      <div
        style={{
          padding: '14px 20px 14px',
          background: 'var(--bg)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* Кнопка назад */}
        <button
          onClick={() =>
            isExternal
              ? navigate(buildProductPath(activeStoreSlug, ean, true), {
                  replace: true,
                  state: { product },
                })
              : navigate(buildProductPath(activeStoreSlug, product?.ean || ean), { replace: true })
          }
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        {/* Аватар */}
        <KorsetAvatar size={38} />

        {/* Имя + статус */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#fff',
              fontFamily: 'var(--font-display)',
              lineHeight: 1.2,
            }}
          >
            Körset AI
          </div>
          <div style={{ fontSize: 12, color: '#34D399', fontWeight: 500, marginTop: 1 }}>
            {t.common.online}
          </div>
        </div>
      </div>

      {/* ── Контекст товара ── */}
      <div
        style={{
          margin: '12px 16px 4px',
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* Фото */}
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            overflow: 'hidden',
            flexShrink: 0,
            background: 'rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {productImage ? (
            <img
              src={productImage}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 22 }}>🛍️</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.4)',
              fontWeight: 600,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              marginBottom: 2,
            }}
          >
            {t.ai.productContext}
          </div>
          <div
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.85)',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {product.name}
          </div>
        </div>
      </div>

      {/* ── Сообщения ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Дисклеймер ИИ */}
        <div
          style={{
            background: 'rgba(250,204,21,0.08)',
            border: '1px solid rgba(250,204,21,0.2)',
            padding: '10px 14px',
            borderRadius: 12,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div style={{ fontSize: 11, color: '#FDE68A', lineHeight: 1.4, opacity: 0.9 }}>
            {lang === 'kz'
              ? 'Ескерту: Жасанды интеллект қателесуі мүмкін. Құрамды әрқашан қаптамадан тексеріңіз. Бұл тек ұсыныс ретінде берілген ақпарат.'
              : 'Внимание: ИИ может ошибаться. Всегда проверяйте состав на упаковке (особенно при строгих правилах Халяль и сильных аллергиях).'}
          </div>
        </div>

        {/* Пустое состояние */}
        {messages.length === 0 && (
          <div
            style={{ padding: '24px 0 8px', display: 'flex', gap: 12, alignItems: 'flex-start' }}
          >
            <KorsetAvatar size={34} />
            <div
              style={{
                background: '#151525',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '13px 16px',
                borderRadius: '4px 18px 18px 18px',
                maxWidth: '85%',
                fontSize: 15,
                lineHeight: 1.65,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {t.ai.welcomeProduct} <strong style={{ color: '#fff' }}>{product.name}</strong>{' '}
              {t.ai.welcomeProductEnd}
            </div>
          </div>
        )}

        {/* Переписка */}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-end',
              gap: 10,
            }}
          >
            {/* Аватар AI слева */}
            {msg.role === 'assistant' && <KorsetAvatar size={34} />}

            <div
              style={
                msg.role === 'user'
                  ? {
                      background: '#7C3AED',
                      padding: '12px 16px',
                      borderRadius: '18px 18px 4px 18px',
                      maxWidth: '78%',
                      fontSize: 15,
                      lineHeight: 1.65,
                      color: '#fff',
                      boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
                    }
                  : {
                      background: '#151525',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '13px 16px',
                      borderRadius: '4px 18px 18px 18px',
                      maxWidth: '85%',
                      fontSize: 15,
                      lineHeight: 1.65,
                      color: 'rgba(255,255,255,0.85)',
                    }
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Индикатор печатает */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <KorsetAvatar size={34} />
            <div
              style={{
                background: '#151525',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '14px 18px',
                borderRadius: '4px 18px 18px 18px',
              }}
            >
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: 'rgba(167,139,250,0.7)',
                      animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 13,
              color: '#F87171',
            }}
          >
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Поле ввода ── */}
      <div
        style={{
          padding: '10px 16px calc(108px + env(safe-area-inset-bottom, 0px))',
          background: '#0C0C18',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        {/* Быстрые вопросы */}
        {messages.length === 0 && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 10,
              scrollbarWidth: 'none',
            }}
          >
            {getChips(t).map((chip) => (
              <button
                key={chip.id}
                onClick={() => sendMessage(buildChipQuestion(chip.id, product, t))}
                disabled={loading}
                style={{
                  flexShrink: 0,
                  padding: '7px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.7)',
                  fontFamily: 'var(--font-body)',
                  whiteSpace: 'nowrap',
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Инпут */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
            placeholder={t.ai.inputProduct}
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
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: 'none',
              cursor: input.trim() ? 'pointer' : 'default',
              background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
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
