import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext.jsx'
import { useI18n } from '../i18n/index.js'
import { useLocalName } from '../utils/localName.js'
import { useOffline } from '../contexts/OfflineContext.jsx'
import KorsetAvatar from '../components/KorsetAvatar.jsx'
import { askProductAIResponse } from '../services/ai.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { buildProductPath } from '../utils/routes.js'
import { resolveProductForProductAI } from '../domain/ai/productContext.js'
import { buildProductAISuggestions } from '../domain/ai/productSuggestions.js'
import { findProductAlternatives } from '../domain/product/alternatives.js'
import { resolveProductByEan } from '../domain/product/resolver.js'
import {
  buildAIChatStorageKey,
  buildStoreAIContext,
  clearAIChatSession,
  loadAIChatSession,
  saveAIChatSession,
} from '../domain/ai/context.js'

function formatAiPrice(value) {
  return Number.isFinite(Number(value))
    ? new Intl.NumberFormat('ru-KZ', {
        style: 'currency',
        currency: 'KZT',
        maximumFractionDigits: 0,
      }).format(Number(value))
    : ''
}

function getStockLabel(t, status) {
  if (status === 'in_stock') return t('ai.stock.inStock')
  if (status === 'low_stock') return t('ai.stock.lowStock')
  if (status === 'out_of_stock') return t('ai.stock.outOfStock')
  return ''
}

function getVerdictStyle(tone) {
  if (tone === 'danger') {
    return {
      background: 'var(--error-dim)',
      border: '1px solid var(--error-border)',
      color: 'var(--error-bright)',
    }
  }
  if (tone === 'caution') {
    return {
      background: 'var(--warning-dim)',
      border: '1px solid var(--warning-border)',
      color: 'var(--warning)',
    }
  }
  if (tone === 'positive') {
    return {
      background: 'var(--success-dim)',
      border: '1px solid var(--success-border)',
      color: 'var(--success-bright)',
    }
  }
  return {
    background: 'var(--glass-subtle)',
    border: '1px solid var(--glass-soft-border)',
    color: 'var(--text-sub)',
  }
}

function ProductAIMessageDetails({ message, t, onProductOpen }) {
  const hasVerdict = message.verdict?.title
  const hasConfidenceNotes =
    Array.isArray(message.confidenceNotes) && message.confidenceNotes.length > 0
  const hasPackageChecks =
    Array.isArray(message.checkOnPackage) && message.checkOnPackage.length > 0
  const hasAlternatives = Array.isArray(message.alternatives) && message.alternatives.length > 0

  if (!hasVerdict && !hasConfidenceNotes && !hasPackageChecks && !hasAlternatives) return null

  return (
    <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
      {hasVerdict && (
        <div
          style={{
            ...getVerdictStyle(message.verdict.tone),
            borderRadius: 12,
            padding: '9px 11px',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t('ai.productVerdict')}
          </div>
          <div style={{ marginTop: 2 }}>{message.verdict.title}</div>
        </div>
      )}

      {hasConfidenceNotes && (
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)' }}>
            {t('ai.confidenceNotes')}
          </div>
          {message.confidenceNotes.map((note, index) => (
            <div
              key={`${note}-${index}`}
              style={{
                fontSize: 12,
                lineHeight: 1.45,
                color: 'var(--text-sub)',
                paddingLeft: 10,
                borderLeft: '2px solid var(--glass-soft-border)',
              }}
            >
              {note}
            </div>
          ))}
        </div>
      )}

      {hasPackageChecks && (
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)' }}>
            {t('ai.checkOnPackage')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {message.checkOnPackage.map((item, index) => (
              <span
                key={`${item}-${index}`}
                style={{
                  border: '1px solid var(--glass-soft-border)',
                  background: 'var(--glass-subtle)',
                  color: 'var(--text-sub)',
                  borderRadius: 999,
                  padding: '5px 8px',
                  fontSize: 11,
                  lineHeight: 1.2,
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasAlternatives && (
        <div style={{ display: 'grid', gap: 7 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)' }}>
            {t('ai.sameStoreAlternatives')}
          </div>
          {message.alternatives.slice(0, 3).map((item) => {
            const price = formatAiPrice(item.priceKzt)
            const stock = getStockLabel(t, item.stockStatus)
            return (
              <button
                type="button"
                key={item.ean}
                onClick={() => onProductOpen(item)}
                style={{
                  width: '100%',
                  border: '1px solid var(--glass-soft-border)',
                  background: 'var(--glass-subtle)',
                  color: 'var(--text)',
                  borderRadius: 12,
                  padding: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div
                  className="catalog-img-box"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    overflow: 'hidden',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      className="product-img-blend"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }}
                    />
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      grocery
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.name}
                  </div>
                  {(price || stock) && (
                    <div style={{ marginTop: 2, fontSize: 11, color: 'var(--text-disabled)' }}>
                      {[price, stock].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AIScreen() {
  const { ean, storeSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useProfile()
  const { lang, t } = useI18n()
  const { currentStore, storeId, catalogProducts = [], isStoreLoading } = useStore()
  const { isOnline } = useOffline()
  const activeStoreSlug = storeSlug || currentStore?.slug || null
  const storeContext = buildStoreAIContext(currentStore, { slug: activeStoreSlug })
  const fallbackProduct = location.state?.product || null
  const initialPrompt =
    typeof location.state?.initialPrompt === 'string' ? location.state.initialPrompt : ''
  const alternativeScenario = location.state?.alternativeScenario || null
  const passedAlternatives = useMemo(
    () =>
      Array.isArray(location.state?.alternatives)
        ? location.state.alternatives.filter((item) => item?.ean).slice(0, 5)
        : [],
    [location.state]
  )
  const isAlternativeSelection = passedAlternatives.length > 0 || !!alternativeScenario
  const chatKey = buildAIChatStorageKey({
    mode: isAlternativeSelection ? 'alternative_selection' : 'product',
    storeSlug: activeStoreSlug,
    ean,
  })
  const [product, setProduct] = useState(fallbackProduct)
  const [isProductLoading, setIsProductLoading] = useState(true)
  const localName = useLocalName(product)
  const autoAlternativeAskedRef = useRef(false)

  const [messages, setMessages] = useState(
    () =>
      loadAIChatSession({
        storage: typeof window !== 'undefined' ? window.localStorage : null,
        key: chatKey,
      }).messages
  )
  const [input, setInput] = useState(initialPrompt)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const productAlternatives = useMemo(() => {
    if (passedAlternatives.length > 0) return passedAlternatives
    return findProductAlternatives({
      product,
      catalogProducts,
      profile,
      limit: 5,
    })
  }, [passedAlternatives, product, catalogProducts, profile])
  const productSuggestions = useMemo(
    () =>
      buildProductAISuggestions({
        product,
        profile,
        alternatives: productAlternatives,
        limit: 5,
      }),
    [product, profile, productAlternatives]
  )

  useEffect(() => {
    let active = true
    const markLoading = () => {
      Promise.resolve().then(() => {
        if (active) setIsProductLoading(true)
      })
    }

    if (storeSlug && !storeId && isStoreLoading && !fallbackProduct) {
      markLoading()
      return () => {
        active = false
      }
    }

    markLoading()
    resolveProductForProductAI({
      productRef: ean,
      storeId,
      catalogProducts,
      fallbackProduct,
      resolveProductByEanImpl: resolveProductByEan,
    })
      .then((resolved) => {
        if (active) setProduct(resolved)
      })
      .finally(() => {
        if (active) setIsProductLoading(false)
      })

    return () => {
      active = false
    }
  }, [ean, storeId, storeSlug, isStoreLoading, catalogProducts, fallbackProduct])

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

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || loading || !product) return
      setError(null)
      const userMsg = { role: 'user', content: text }
      const newMessages = [...messages, userMsg]
      setMessages(newMessages)
      setInput('')
      setLoading(true)
      try {
        const response = await askProductAIResponse(
          newMessages,
          product,
          profile,
          lang,
          storeContext,
          productAlternatives
        )
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: response.reply,
            verdict: response.verdict,
            confidenceNotes: response.confidenceNotes,
            checkOnPackage: response.checkOnPackage,
            alternatives: response.alternatives,
            warnings: response.warnings,
          },
        ])
      } catch (e) {
        setError(`${t('ai.errorPrefix')} ${e.message}`)
        setMessages((prev) => prev.slice(0, -1))
      } finally {
        setLoading(false)
      }
    },
    [loading, product, messages, profile, lang, storeContext, productAlternatives, t]
  )

  useEffect(() => {
    if (!isAlternativeSelection) return
    if (autoAlternativeAskedRef.current) return
    if (isProductLoading || !product || messages.length > 0 || loading) return
    autoAlternativeAskedRef.current = true
    const prompt = t('ai.alternativeSelectionPrompt', {
      name: localName || product.name,
    })
    const timer = window.setTimeout(() => sendMessage(prompt), 0)
    return () => window.clearTimeout(timer)
  }, [
    isAlternativeSelection,
    isProductLoading,
    product,
    messages.length,
    loading,
    localName,
    t,
    sendMessage,
  ])

  if (isProductLoading) {
    return (
      <div
        className="screen"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <p style={{ color: 'var(--text-dim)' }}>{t('common.loading')}</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div
        className="screen"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <p style={{ color: 'var(--text-dim)' }}>{t('common.notFound')}</p>
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
          style={{ fontSize: 48, color: 'var(--text-disabled)' }}
        >
          cloud_off
        </span>
        <p style={{ color: 'var(--text-faint)', textAlign: 'center', fontSize: 14 }}>
          {t('scan.aiOffline')}
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
          borderBottom: '1px solid var(--glass-soft-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* Кнопка назад */}
        <button
          onClick={() =>
            navigate(buildProductPath(activeStoreSlug, product?.ean || ean), { replace: true })
          }
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            border: '1px solid var(--glass-soft-border)',
            background: 'var(--glass-subtle)',
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
            stroke="var(--text)"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        {/* Аватар */}
        <KorsetAvatar size={38} />

        {/* Имя + статус */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text)',
              fontFamily: 'var(--font-display)',
              lineHeight: 1.2,
            }}
          >
            Körset AI
          </div>
          <div
            style={{ fontSize: 12, color: 'var(--success-bright)', fontWeight: 500, marginTop: 1 }}
          >
            {t('common.online')}
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

      {/* ── Контекст товара ── */}
      <div
        style={{
          margin: '12px 16px 4px',
          padding: '10px 14px',
          background: 'var(--glass-subtle)',
          border: '1px solid var(--glass-soft-border)',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* Фото */}
        <div
          className="catalog-img-box"
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {productImage ? (
            <img
              src={productImage}
              alt=""
              className="product-img-blend"
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }}
            />
          ) : (
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 22, color: 'var(--text-disabled)' }}
            >
              grocery
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              color: 'var(--text-disabled)',
              fontWeight: 600,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              marginBottom: 2,
            }}
          >
            {isAlternativeSelection ? t('ai.alternativeSelectionContext') : t('ai.productContext')}
          </div>
          <div
            style={{
              fontSize: 14,
              color: 'var(--text)',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {localName}
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
            background: 'var(--warning-dim)',
            border: '1px solid var(--warning-border)',
            padding: '10px 14px',
            borderRadius: 12,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 17, color: 'var(--warning)', lineHeight: 1.2 }}
          >
            warning
          </span>
          <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.4, opacity: 0.9 }}>
            {t('ai.disclaimer')}
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
              {isAlternativeSelection ? (
                t('ai.welcomeAlternativeSelection', {
                  name: localName,
                  count: productAlternatives.length,
                })
              ) : (
                <>
                  {t('ai.welcomeProduct')}{' '}
                  <strong style={{ color: 'var(--text)' }}>{localName}</strong>{' '}
                  {t('ai.welcomeProductEnd')}
                </>
              )}
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
                      background: 'var(--primary)',
                      padding: '12px 16px',
                      borderRadius: '18px 18px 4px 18px',
                      maxWidth: '78%',
                      fontSize: 15,
                      lineHeight: 1.65,
                      color: 'var(--text-inverse)',
                      boxShadow: 'var(--shadow-soft)',
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
              {msg.role === 'assistant' && (
                <ProductAIMessageDetails
                  message={msg}
                  t={t}
                  onProductOpen={(item) =>
                    navigate(buildProductPath(activeStoreSlug, item.ean), {
                      state: { product: item },
                    })
                  }
                />
              )}
            </div>
          </div>
        ))}

        {/* Индикатор печатает */}
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
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
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

        {error && (
          <div
            style={{
              background: 'var(--error-dim)',
              border: '1px solid var(--error-border)',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 13,
              color: 'var(--error-bright)',
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
          background: 'var(--bg)',
          borderTop: '1px solid var(--glass-border)',
          flexShrink: 0,
        }}
      >
        {/* Быстрые вопросы */}
        {messages.length === 0 && productSuggestions.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              paddingBottom: 10,
            }}
          >
            {productSuggestions.map((chip, index) => (
              <button
                key={chip.id}
                onClick={() =>
                  sendMessage(
                    t(chip.questionKey, {
                      name: localName || product.name,
                      ...(chip.values || {}),
                    })
                  )
                }
                disabled={loading}
                style={{
                  flex: index === 0 ? '1 1 100%' : '0 1 auto',
                  minHeight: index === 0 ? 38 : 32,
                  padding: index === 0 ? '9px 14px' : '7px 12px',
                  borderRadius: index === 0 ? 14 : 18,
                  fontSize: 13,
                  fontWeight: index === 0 ? 700 : 500,
                  cursor: 'pointer',
                  border: '1px solid var(--glass-soft-border)',
                  background: index === 0 ? 'var(--glass)' : 'var(--glass-subtle)',
                  color: index === 0 ? 'var(--text)' : 'var(--text-sub)',
                  fontFamily: 'var(--font-body)',
                  textAlign: 'left',
                }}
              >
                {t(chip.labelKey, chip.values || {})}
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
            placeholder={t('ai.inputProduct')}
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
              transition: 'all 0.2s ease',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-inverse)"
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
