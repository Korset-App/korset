import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useI18n } from '../i18n/index.js'
import KorsetAvatar from '../components/KorsetAvatar.jsx'
import { askGeneralAI } from '../services/ai.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { useProfile } from '../contexts/ProfileContext.jsx'
import {
  buildAIChatStorageKey,
  buildStoreAIContext,
  clearAIChatSession,
  loadAIChatSession,
  saveAIChatSession,
} from '../domain/ai/context.js'
import { buildCatalogAIContext, findCatalogCandidates } from '../domain/ai/catalogSearch.js'
import { buildProductPath } from '../utils/routes.js'

function MessageProductGroups({ groups, storeSlug, t }) {
  const [expanded, setExpanded] = useState({})
  if (!groups?.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
      {groups.map((group) => {
        const isExpanded = !!expanded[group.id]
        const visible = isExpanded ? group.products : group.products.slice(0, 1)
        const hiddenCount = Math.max(0, group.products.length - visible.length)
        return (
          <div
            key={group.id}
            style={{
              border: '1px solid var(--glass-soft-border)',
              background: 'var(--glass-subtle)',
              borderRadius: 14,
              padding: 10,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: 'var(--text-sub)',
                marginBottom: 8,
                textTransform: 'uppercase',
              }}
            >
              {group.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visible.map((product) => (
                <a
                  key={product.ean}
                  href={buildProductPath(storeSlug, product.ean)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '46px 1fr auto',
                    gap: 10,
                    alignItems: 'center',
                    textDecoration: 'none',
                    color: 'var(--text)',
                    background: 'var(--bg)',
                    border: '1px solid var(--glass-soft-border)',
                    borderRadius: 12,
                    padding: 8,
                  }}
                >
                  <div
                    className="catalog-img-box"
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 10,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {product.image ? (
                      <img
                        src={product.image}
                        alt=""
                        className="product-img-blend"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                      />
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                        grocery
                      </span>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {product.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-faint)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: 2,
                      }}
                    >
                      {[product.brand, product.stockStatus].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--primary)' }}>
                    {product.priceKzt ? `${product.priceKzt} ₸` : ''}
                  </div>
                </a>
              ))}
            </div>
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((prev) => ({ ...prev, [group.id]: true }))}
                style={{
                  marginTop: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--primary)',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {t('ai.showMoreProducts', { count: hiddenCount })}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function AIAssistantScreen() {
  const { lang, t, exists } = useI18n()
  const { storeSlug: routeStoreSlug } = useParams()
  const { currentStore, storeSlug, catalogProducts = [] } = useStore()
  const { profile } = useProfile()
  const storeContext = buildStoreAIContext(currentStore, { slug: routeStoreSlug || storeSlug })
  const chatKey = buildAIChatStorageKey({
    mode: 'general',
    storeSlug: storeContext?.slug || routeStoreSlug || storeSlug,
  })
  const generalChips = []
  let gi = 0
  while (exists(`ai.generalChips.${gi}`)) {
    generalChips.push(t(`ai.generalChips.${gi}`))
    gi++
  }
  const [messages, setMessages] = useState(
    () =>
      loadAIChatSession({
        storage: typeof window !== 'undefined' ? window.localStorage : null,
        key: chatKey,
      }).messages
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    saveAIChatSession({
      storage: typeof window !== 'undefined' ? window.localStorage : null,
      key: chatKey,
      messages,
    })
  }, [chatKey, messages])

  const clearChat = () => {
    clearAIChatSession({
      storage: typeof window !== 'undefined' ? window.localStorage : null,
      key: chatKey,
    })
    setMessages([])
  }

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const candidates = findCatalogCandidates(text, catalogProducts, profile, { limit: 20 })
      const catalogContext = buildCatalogAIContext(candidates, { maxItems: 20 })
      const response = await askGeneralAI(newMessages, lang, storeContext, profile, catalogContext)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.reply,
          productGroups: response.productGroups || [],
          followUps: response.followUps || [],
          warnings: response.warnings || [],
        },
      ])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: t('ai.errorGeneric') }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          padding: '16px 20px 14px',
          flexShrink: 0,
          borderBottom: '1px solid var(--glass-soft-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <KorsetAvatar size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--text)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Körset AI
          </div>
          <div style={{ fontSize: 12, color: '#34D399', fontWeight: 500, marginTop: 1 }}>
            {storeContext?.name
              ? t('ai.generalStoreSubtitle', { store: storeContext.name })
              : t('ai.generalSubtitle')}
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              border: '1px solid var(--glass-soft-border)',
              background: 'var(--glass-subtle)',
              color: 'var(--text-sub)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label={t('ai.clearChat')}
            title={t('ai.clearChat')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
              delete
            </span>
          </button>
        )}
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px 140px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {messages.length === 0 && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <KorsetAvatar size={34} />
            <div
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-soft-border)',
                padding: '13px 16px',
                borderRadius: '4px 18px 18px 18px',
                maxWidth: '85%',
                fontSize: 15,
                lineHeight: 1.65,
                color: 'var(--text)',
              }}
            >
              {storeContext?.name
                ? t('ai.welcomeGeneralStore', { store: storeContext.name })
                : t('ai.welcomeGeneral')}
            </div>
          </div>
        )}
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
            {msg.role === 'assistant' && <KorsetAvatar size={34} />}
            <div
              style={
                msg.role === 'user'
                  ? {
                      background: 'var(--primary)',
                      padding: '12px 16px',
                      borderRadius: '18px 18px 4px 18px',
                      maxWidth: '78%',
                      fontSize: 15,
                      lineHeight: 1.65,
                      color: '#fff',
                      boxShadow: '0 4px 16px var(--primary-glow)',
                    }
                  : {
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-soft-border)',
                      padding: '13px 16px',
                      borderRadius: '4px 18px 18px 18px',
                      maxWidth: '85%',
                      fontSize: 15,
                      lineHeight: 1.65,
                      color: 'var(--text)',
                    }
              }
            >
              {msg.content}
              {msg.role === 'assistant' && msg.warnings?.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-faint)' }}>
                  {msg.warnings[0]}
                </div>
              )}
              {msg.role === 'assistant' && (
                <MessageProductGroups
                  groups={msg.productGroups}
                  storeSlug={storeContext?.slug || routeStoreSlug || storeSlug}
                  t={t}
                />
              )}
              {msg.role === 'assistant' && msg.followUps?.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                    marginTop: 10,
                  }}
                >
                  {msg.followUps.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => sendMessage(item)}
                      disabled={loading}
                      style={{
                        border: '1px solid var(--glass-soft-border)',
                        background: 'var(--glass-subtle)',
                        color: 'var(--text-sub)',
                        borderRadius: 999,
                        padding: '6px 9px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <KorsetAvatar size={34} />
            <div
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-soft-border)',
                padding: '14px 18px',
                borderRadius: '4px 18px 18px 18px',
              }}
            >
              <div style={{ display: 'flex', gap: 5 }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: 'var(--primary-bright)',
                      animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: '86px',
          zIndex: 90,
          padding: '8px 16px 16px',
          background: 'var(--bg)',
          borderTop: '1px solid var(--glass-border)',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              scrollbarWidth: 'none',
              paddingBottom: 10,
            }}
          >
            {generalChips.map((chip) => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                style={{
                  flexShrink: 0,
                  padding: '7px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: '1px solid var(--glass-soft-border)',
                  background: 'var(--glass-subtle)',
                  color: 'var(--text-sub)',
                  fontFamily: 'var(--font-body)',
                  whiteSpace: 'nowrap',
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
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
            placeholder={t('ai.inputGeneral')}
            disabled={loading}
            style={{
              flex: 1,
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              borderRadius: 24,
              padding: '13px 18px',
              fontSize: 15,
              color: 'var(--text)',
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
              background: 'linear-gradient(135deg, var(--primary), var(--primary-mid))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 16px var(--primary-glow)',
              opacity: input.trim() ? 1 : 0.5,
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
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`}</style>
    </div>
  )
}
