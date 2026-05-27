import { useState, useRef, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
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
import './AIAssistantScreen.css'

function renderMessageText(text) {
  const paragraphs = String(text || '')
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)

  return paragraphs.map((paragraph, paragraphIndex) => (
    <p
      key={paragraphIndex}
      className={
        paragraphIndex === 0
          ? 'ai-message-text__paragraph ai-message-text__paragraph--first'
          : 'ai-message-text__paragraph'
      }
    >
      {paragraph.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <strong key={index}>{part.slice(1, -1)}</strong>
        }
        return part
      })}
    </p>
  ))
}

function getStockLabel(status, t) {
  if (status === 'in_stock') return t('ai.stock.inStock')
  if (status === 'low_stock') return t('ai.stock.lowStock')
  if (status === 'out_of_stock') return t('ai.stock.outOfStock')
  return ''
}

function MessageProductGroups({ groups, storeSlug, t }) {
  const [expanded, setExpanded] = useState({})
  if (!groups?.length) return null

  return (
    <div className="ai-product-groups">
      {groups.map((group) => {
        const isExpanded = !!expanded[group.id]
        const visible = isExpanded ? group.products : group.products.slice(0, 1)
        const hiddenCount = Math.max(0, group.products.length - visible.length)
        return (
          <div key={group.id} className="ai-product-group">
            <div className="ai-product-group__title">{group.title}</div>
            <div className="ai-product-list">
              {visible.map((product) => (
                <Link
                  key={product.ean}
                  to={buildProductPath(storeSlug, product.ean)}
                  className="ai-product-card"
                >
                  <div className="catalog-img-box ai-product-card__image">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt=""
                        className="product-img-blend ai-product-card__img"
                      />
                    ) : (
                      <span className="material-symbols-outlined ai-product-card__fallback-icon">
                        grocery
                      </span>
                    )}
                  </div>
                  <div className="ai-product-card__body">
                    <div className="ai-product-card__name">{product.name}</div>
                    <div className="ai-product-card__meta">
                      {[product.brand, getStockLabel(product.stockStatus, t)]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                  <div className="ai-product-card__price">
                    {product.priceKzt ? `${product.priceKzt} ₸` : ''}
                  </div>
                </Link>
              ))}
            </div>
            {group.products.length > 1 && (
              <button
                type="button"
                onClick={() => setExpanded((prev) => ({ ...prev, [group.id]: !isExpanded }))}
                className="ai-product-toggle"
              >
                {isExpanded
                  ? t('ai.hideProducts')
                  : t('ai.showMoreProducts', { count: hiddenCount })}
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
    <div className="ai-screen">
      <div className="ai-header">
        <KorsetAvatar size={40} />
        <div className="ai-header__identity">
          <div className="ai-header__title">Körset AI</div>
          <div className="ai-header__subtitle">
            {storeContext?.name
              ? t('ai.generalStoreSubtitle', { store: storeContext.name })
              : t('ai.generalSubtitle')}
          </div>
        </div>
        <div
          className="ai-header__actions"
          aria-hidden={messages.length === 0 ? 'true' : undefined}
        >
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="ai-icon-button"
              aria-label={t('ai.clearChat')}
              title={t('ai.clearChat')}
            >
              <span className="material-symbols-outlined ai-icon-button__icon">delete</span>
            </button>
          )}
        </div>
      </div>
      <div className="ai-scroll">
        {messages.length === 0 && (
          <div className="ai-empty-state">
            <div className="ai-empty-panel">
              <div className="ai-empty-panel__avatar">
                <KorsetAvatar size={34} />
              </div>
              <div className="ai-empty-panel__content">
                <div className="ai-empty-panel__eyebrow">{t('ai.empty.eyebrow')}</div>
                <h1 className="ai-empty-panel__title">{t('ai.empty.title')}</h1>
                <p className="ai-empty-panel__description">
                  {storeContext?.name
                    ? t('ai.empty.description', { store: storeContext.name })
                    : t('ai.welcomeGeneral')}
                </p>
              </div>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`ai-message-row ai-message-row--${msg.role}`}>
            {msg.role === 'assistant' && <KorsetAvatar size={34} />}
            <div className={`ai-bubble ai-bubble--${msg.role}`}>
              {renderMessageText(msg.content)}
              {msg.role === 'assistant' && msg.warnings?.length > 0 && (
                <div className="ai-warning-note">{msg.warnings[0]}</div>
              )}
              {msg.role === 'assistant' && (
                <MessageProductGroups
                  groups={msg.productGroups}
                  storeSlug={storeContext?.slug || routeStoreSlug || storeSlug}
                  t={t}
                />
              )}
              {msg.role === 'assistant' && msg.followUps?.length > 0 && (
                <div className="ai-follow-ups">
                  {msg.followUps.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => sendMessage(item)}
                      disabled={loading}
                      className="ai-follow-up-chip"
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
          <div className="ai-typing">
            <KorsetAvatar size={34} />
            <div className="ai-typing__bubble">
              <div className="ai-typing__dots">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="ai-typing__dot" />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="ai-composer">
        {messages.length === 0 && (
          <div className="ai-quick-prompts">
            {generalChips.map((chip) => (
              <button key={chip} onClick={() => sendMessage(chip)} className="ai-quick-prompt">
                {chip}
              </button>
            ))}
          </div>
        )}
        <div className="ai-composer__row">
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
            className="ai-composer__input"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="ai-composer__send"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
