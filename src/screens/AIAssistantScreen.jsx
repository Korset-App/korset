/* global MediaRecorder, Blob, ResizeObserver */
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../i18n/index.js'
import KorsetAvatar from '../components/KorsetAvatar.jsx'
import { HistoryIcon } from '../components/icons/HistoryIcon.jsx'
import { TrashIcon } from '../components/icons/TrashIcon.jsx'
import { WalletIcon } from '../components/icons/WalletIcon.jsx'
import { FlaskIcon } from '../components/icons/FlaskIcon.jsx'
import { CartIcon } from '../components/icons/CartIcon.jsx'
import { CameraIcon } from '../components/icons/CameraIcon.jsx'
import { GalleryIcon } from '../components/icons/GalleryIcon.jsx'
import { IconGallery } from '../components/icons/IconGallery.jsx'
import {
  CloseIcon,
  PlusIcon,
  SearchIcon,
  MicrophoneIcon,
  SendIcon,
  StopSquareIcon,
} from '../components/icons/index.js'
import { askGeneralAI, askPackageImageAI, transcribeVoiceInput } from '../services/ai.js'
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
import { GENERAL_AI_CAPABILITIES } from '../domain/ai/generalCapabilities.js'
import { AI_IMAGE_INPUT_LIMITS, prepareAIImageFile } from '../domain/ai/imageInput.js'
import { createIndexedDBAIChatHistoryStore } from '../domain/ai/localChatHistory.js'
import {
  AI_VOICE_LIMITS,
  getSupportedVoiceMimeType,
  mergeVoiceTranscriptIntoInput,
  normalizeVoiceRecordingDuration,
  validateVoiceRecording,
} from '../domain/ai/voiceTranscription.js'
import { buildProductPath } from '../utils/routes.js'
import './AIAssistantScreen.css'

const VOICE_PRIVACY_KEY = 'korset_ai_voice_privacy_seen'
const AI_DRAFT_KEY_PREFIX = 'korset_ai_draft_'
const DEFAULT_AI_LAYOUT_METRICS = { composerHeight: 96, bottomNavHeight: 76 }

function getStoredAIDraft(storeSlug) {
  if (typeof window === 'undefined') return ''
  try {
    return window.sessionStorage.getItem(`${AI_DRAFT_KEY_PREFIX}${storeSlug}`) || ''
  } catch {
    return ''
  }
}

function saveStoredAIDraft(storeSlug, text) {
  if (typeof window === 'undefined') return
  try {
    if (text && text.trim()) {
      window.sessionStorage.setItem(`${AI_DRAFT_KEY_PREFIX}${storeSlug}`, text)
    } else {
      window.sessionStorage.removeItem(`${AI_DRAFT_KEY_PREFIX}${storeSlug}`)
    }
  } catch (_err) {
    // ignore storage quota or private mode errors
  }
}

function clearStoredAIDraft(storeSlug) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(`${AI_DRAFT_KEY_PREFIX}${storeSlug}`)
  } catch (_err) {
    // ignore storage quota or private mode errors
  }
}

function formatHistoryDate(value, lang) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''

  try {
    return new Intl.DateTimeFormat(lang === 'kz' ? 'kk-KZ' : 'ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return ''
  }
}

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
  const { lang, t } = useI18n()
  const location = useLocation()
  const { storeSlug: routeStoreSlug } = useParams()
  const { currentStore, storeSlug, catalogProducts = [] } = useStore()
  const { profile } = useProfile()
  const storeContext = buildStoreAIContext(currentStore, { slug: routeStoreSlug || storeSlug })
  const activeStoreSlug = storeContext?.slug || routeStoreSlug || storeSlug || 'default'
  const chatKey = buildAIChatStorageKey({
    mode: 'general',
    storeSlug: activeStoreSlug,
  })
  const [messages, setMessages] = useState(
    () =>
      loadAIChatSession({
        storage: typeof window !== 'undefined' ? window.localStorage : null,
        key: chatKey,
      }).messages
  )
  const [messagesStoreSlug, setMessagesStoreSlug] = useState(activeStoreSlug)
  const [input, setInput] = useState(() => getStoredAIDraft(activeStoreSlug))
  const initialPromptProcessed = useRef(false)

  useEffect(() => {
    const initialPrompt = location.state?.initialPrompt
    if (initialPrompt && !initialPromptProcessed.current) {
      initialPromptProcessed.current = true
      setInput(initialPrompt)
      saveStoredAIDraft(activeStoreSlug, initialPrompt)
    }
  }, [location.state, activeStoreSlug])

  useEffect(() => {
    saveStoredAIDraft(activeStoreSlug, input)
  }, [input, activeStoreSlug])
  const [loading, setLoading] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyItems, setHistoryItems] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [deleteCandidateId, setDeleteCandidateId] = useState(null)
  const [clearConfirming, setClearConfirming] = useState(false)
  const [recording, setRecording] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('idle')
  const [voiceError, setVoiceError] = useState('')
  const [voiceLevel, setVoiceLevel] = useState(0)
  const [voiceElapsedMs, setVoiceElapsedMs] = useState(0)
  const [voiceDraft, setVoiceDraft] = useState('')
  const [imagePickerOpen, setImagePickerOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imageError, setImageError] = useState('')
  const [voicePrivacySeen, setVoicePrivacySeen] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(VOICE_PRIVACY_KEY) === 'true'
  })
  const screenRef = useRef(null)
  const bottomRef = useRef(null)
  const composerRef = useRef(null)
  const composerInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const historyStoreRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const voiceChunksRef = useRef([])
  const voiceStartedAtRef = useRef(0)
  const voiceStoppedByLimitRef = useRef(false)
  const voiceStreamRef = useRef(null)
  const voiceStopTimerRef = useRef(null)
  const voiceTickTimerRef = useRef(null)
  const voiceAnimationRef = useRef(null)
  const voiceAudioContextRef = useRef(null)
  const voiceRecognitionRef = useRef(null)
  const voiceDraftRef = useRef('')
  const inputBeforeVoiceRef = useRef('')
  const visibleMessages = messagesStoreSlug === activeStoreSlug ? messages : []
  const voiceProcessing = voiceStatus === 'uploading' || voiceStatus === 'transcribing'
  const [isMultiline, setIsMultiline] = useState(false)
  const imageAccept = AI_IMAGE_INPUT_LIMITS.acceptedMimeTypes.join(',')
  const composerExpanded =
    isMultiline ||
    input.includes('\n') ||
    input.length > 42 ||
    Boolean(selectedImage) ||
    Boolean(imageError) ||
    imagePickerOpen

  useEffect(() => {
    if (!historyStoreRef.current && typeof window !== 'undefined' && window.indexedDB) {
      historyStoreRef.current = createIndexedDBAIChatHistoryStore()
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const updateLayoutMetrics = () => {
      const composerHeight = Math.ceil(
        composerRef.current?.getBoundingClientRect().height ||
          DEFAULT_AI_LAYOUT_METRICS.composerHeight
      )
      const bottomNav = document.querySelector('.bottom-nav')
      const bottomNavHeight = Math.ceil(
        bottomNav?.getBoundingClientRect().height || DEFAULT_AI_LAYOUT_METRICS.bottomNavHeight
      )

      screenRef.current?.style.setProperty('--ai-composer-space', `${composerHeight}px`)
      screenRef.current?.style.setProperty('--ai-bottom-nav-space', `${bottomNavHeight}px`)
    }

    updateLayoutMetrics()
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateLayoutMetrics) : null
    const bottomNav = document.querySelector('.bottom-nav')

    if (resizeObserver) {
      if (composerRef.current) resizeObserver.observe(composerRef.current)
      if (bottomNav) resizeObserver.observe(bottomNav)
    }

    window.addEventListener('resize', updateLayoutMetrics)
    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateLayoutMetrics)
    }
  }, [])

  useEffect(() => {
    const inputElement = composerInputRef.current
    if (!inputElement) return

    if (!input) {
      setIsMultiline(false)
      inputElement.style.height = ''
      return
    }

    inputElement.style.height = 'auto'
    const scrollHeight = inputElement.scrollHeight
    const hasExplicitNewline = input.includes('\n')
    const multiline = hasExplicitNewline || scrollHeight > 44 || input.length > 42
    setIsMultiline(multiline)
    if (multiline) {
      inputElement.style.height = `${Math.min(scrollHeight, 120)}px`
    } else {
      inputElement.style.height = ''
    }
  }, [input])

  useEffect(() => {
    if (messagesStoreSlug !== activeStoreSlug) return undefined

    saveAIChatSession({
      storage: typeof window !== 'undefined' ? window.localStorage : null,
      key: chatKey,
      messages,
    })

    if (!messages.length || !historyStoreRef.current) return undefined

    let cancelled = false
    historyStoreRef.current
      .upsertConversation({
        id: activeConversationId,
        storeSlug: activeStoreSlug,
        messages,
      })
      .then((conversation) => {
        if (cancelled) return
        if (!activeConversationId) setActiveConversationId(conversation.id)
        if (historyOpen) {
          return historyStoreRef.current.listConversations(activeStoreSlug).then(setHistoryItems)
        }
        return null
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [activeConversationId, activeStoreSlug, chatKey, historyOpen, messages, messagesStoreSlug])

  useEffect(() => {
    if (historyOpen) {
      document.body.classList.add('ai-history-open')
      document.body.style.overflow = 'hidden'
    } else {
      document.body.classList.remove('ai-history-open')
      document.body.style.overflow = ''
    }
    return () => {
      document.body.classList.remove('ai-history-open')
      document.body.style.overflow = ''
    }
  }, [historyOpen])

  useEffect(() => {
    if (!historyOpen || !historyStoreRef.current) return undefined

    let cancelled = false
    setHistoryLoading(true)
    setDeleteCandidateId(null)
    setClearConfirming(false)
    historyStoreRef.current
      .listConversations(activeStoreSlug)
      .then((items) => {
        if (!cancelled) setHistoryItems(items)
      })
      .catch(() => {
        if (!cancelled) setHistoryItems([])
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeStoreSlug, historyOpen])

  const startNewChat = ({ closeHistory = true } = {}) => {
    clearAIChatSession({
      storage: typeof window !== 'undefined' ? window.localStorage : null,
      key: chatKey,
    })
    setMessages([])
    setMessagesStoreSlug(activeStoreSlug)
    setInput('')
    setSelectedImage(null)
    setImageError('')
    setImagePickerOpen(false)
    setActiveConversationId(null)
    setDeleteCandidateId(null)
    setClearConfirming(false)
    if (closeHistory) setHistoryOpen(false)
  }

  const clearChat = () => {
    startNewChat()
  }

  const openConversation = async (id) => {
    if (!historyStoreRef.current) return
    const conversation = await historyStoreRef.current.getConversation(id)
    if (!conversation || conversation.storeSlug !== activeStoreSlug) return
    setMessages(conversation.messages || [])
    setMessagesStoreSlug(activeStoreSlug)
    setInput('')
    setSelectedImage(null)
    setImageError('')
    setImagePickerOpen(false)
    setActiveConversationId(conversation.id)
    setDeleteCandidateId(null)
    setClearConfirming(false)
    setHistoryOpen(false)
  }

  const requestDeleteConversation = (id) => {
    setDeleteCandidateId((current) => (current === id ? null : id))
    setClearConfirming(false)
  }

  const confirmDeleteConversation = async (id) => {
    if (!historyStoreRef.current) return
    await historyStoreRef.current.deleteConversation(id)
    if (activeConversationId === id) startNewChat({ closeHistory: false })
    setDeleteCandidateId(null)
    setHistoryItems(await historyStoreRef.current.listConversations(activeStoreSlug))
  }

  const confirmClearStoreHistory = async () => {
    if (!historyStoreRef.current) return
    await historyStoreRef.current.clearStoreConversations(activeStoreSlug)
    startNewChat({ closeHistory: false })
    setHistoryItems([])
    setDeleteCandidateId(null)
    setClearConfirming(false)
  }

  const cleanupVoiceRecording = () => {
    if (voiceStopTimerRef.current) window.clearTimeout(voiceStopTimerRef.current)
    if (voiceTickTimerRef.current) window.clearInterval(voiceTickTimerRef.current)
    if (voiceAnimationRef.current) window.cancelAnimationFrame(voiceAnimationRef.current)
    voiceStopTimerRef.current = null
    voiceTickTimerRef.current = null
    voiceAnimationRef.current = null
    voiceRecognitionRef.current?.stop?.()
    voiceRecognitionRef.current = null
    voiceAudioContextRef.current?.close?.().catch(() => {})
    voiceAudioContextRef.current = null
    voiceStreamRef.current?.getTracks?.().forEach((track) => track.stop())
    voiceStreamRef.current = null
    mediaRecorderRef.current = null
    voiceStoppedByLimitRef.current = false
    setVoiceLevel(0)
    setRecording(false)
  }

  const formatVoiceTime = (ms) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000))
    return `0:${String(totalSeconds).padStart(2, '0')}`
  }

  const startVoiceMeter = (stream) => {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext
    if (!AudioContextCtor) return

    try {
      const audioContext = new AudioContextCtor()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.4
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      voiceAudioContextRef.current = audioContext

      let lastUpdate = 0
      const tick = (now) => {
        analyser.getByteFrequencyData(data)
        let sum = 0
        let count = 0
        for (let i = 2; i < Math.min(data.length, 28); i++) {
          sum += data[i]
          count++
        }
        const avg = count ? sum / count : 0
        const normalized = Math.max(0, Math.min(1, (avg - 6) / 28))
        if (!lastUpdate || now - lastUpdate > 50) {
          lastUpdate = now
          setVoiceLevel((prev) => Math.round((prev * 0.35 + normalized * 0.65) * 100) / 100)
        }
        voiceAnimationRef.current = window.requestAnimationFrame(tick)
      }

      voiceAnimationRef.current = window.requestAnimationFrame(tick)
    } catch {
      setVoiceLevel(0.32)
    }
  }

  const startVoiceDraftRecognition = () => {
    const RecognitionCtor =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null
    if (!RecognitionCtor) return

    try {
      const recognition = new RecognitionCtor()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = lang === 'kz' ? 'kk-KZ' : 'ru-RU'
      recognition.maxAlternatives = 1

      recognition.onresult = (event) => {
        let interimText = ''
        let finalText = ''
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i]
          const part = result[0]?.transcript || ''
          if (result.isFinal) {
            finalText += (finalText ? ' ' : '') + part
          } else {
            interimText += (interimText ? ' ' : '') + part
          }
        }
        const combined = [finalText, interimText].filter(Boolean).join(' ').trim()
        if (combined) {
          voiceDraftRef.current = combined
          setVoiceDraft(combined)
          setInput(mergeVoiceTranscriptIntoInput(inputBeforeVoiceRef.current, combined))
        }
      }

      recognition.onerror = (e) => {
        console.warn('[ai-voice] draft recognition:', e?.error)
      }

      recognition.onend = () => {
        voiceRecognitionRef.current = null
      }

      recognition.start()
      voiceRecognitionRef.current = recognition
    } catch {
      voiceRecognitionRef.current = null
    }
  }

  const getVoiceErrorText = (error) => {
    if (error === 'audio_too_short') return t('ai.voice.errorTooShort')
    if (error === 'audio_too_long') return t('ai.voice.errorTooLong')
    if (error === 'audio_too_large') return t('ai.voice.errorTooLarge')
    if (error === 'permission_denied') return t('ai.voice.errorPermission')
    if (error === 'unsupported') return t('ai.voice.errorUnsupported')
    if (error === 'empty_transcription') return t('ai.voice.errorEmpty')
    if (error === 'insecure_context') return t('ai.voice.errorInsecureContext')
    if (error === 'transcription_timeout') return t('ai.voice.errorTimeout')
    if (error === 'transcription_unavailable') return t('ai.voice.errorUnavailable')
    return t('ai.voice.errorGeneric')
  }

  const getVoicePanelLabel = () => {
    if (voiceStatus === 'requesting') return t('ai.voice.requesting')
    if (voiceStatus === 'uploading') return t('ai.voice.uploading')
    if (voiceStatus === 'transcribing') return t('ai.voice.transcribing')
    return t('ai.voice.recordingShort')
  }

  const getImageErrorText = (error) => {
    if (error === 'unsupported_image_type') return t('ai.image.errorUnsupported')
    if (error === 'image_empty') return t('ai.image.errorEmpty')
    if (error === 'image_source_too_large') return t('ai.image.errorSourceTooLarge')
    if (error === 'image_payload_too_large') return t('ai.image.errorPayloadTooLarge')
    if (error === 'image_ai_timeout') return t('ai.image.errorTimeout')
    if (error === 'image_ai_unavailable') return t('ai.image.errorUnavailable')
    return t('ai.image.errorGeneric')
  }

  const handleImageFileSelected = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImageError('')
    try {
      const preparedImage = await prepareAIImageFile(file)
      setSelectedImage(preparedImage)
      setImagePickerOpen(false)
    } catch (error) {
      setSelectedImage(null)
      setImageError(error?.message || 'image_failed')
    }
  }

  const removeSelectedImage = () => {
    setSelectedImage(null)
    setImageError('')
  }

  const insertVoiceText = (text) => {
    const cleanText = String(text || '').trim()
    if (!cleanText) return false
    setInput((current) => mergeVoiceTranscriptIntoInput(current, cleanText))
    return true
  }

  const insertVoiceDraftFallback = () => {
    const draft = voiceDraftRef.current.trim()
    const inputHasText = input.trim().length > inputBeforeVoiceRef.current.trim().length
    if (!draft && !inputHasText) return false
    if (draft) insertVoiceText(draft)
    setVoiceDraft('')
    voiceDraftRef.current = ''
    setVoiceError('')
    setVoiceStatus('draft_inserted')
    window.setTimeout(() => setVoiceStatus('idle'), 2600)
    return true
  }

  const stopVoiceRecording = ({ stoppedByLimit = false } = {}) => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      voiceStoppedByLimitRef.current = stoppedByLimit
      recorder.stop()
      setRecording(false)
      setVoiceLevel(0.32)
      if (stoppedByLimit) setVoiceElapsedMs(AI_VOICE_LIMITS.maxDurationMs)
      setVoiceStatus('uploading')
    }
  }

  const startVoiceRecording = async () => {
    if (loading || recording || voiceStatus === 'transcribing') return
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setVoiceError('insecure_context')
      setVoiceStatus('error')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceError('unsupported')
      setVoiceStatus('error')
      return
    }

    setVoiceError('')
    setVoiceDraft('')
    voiceDraftRef.current = ''
    inputBeforeVoiceRef.current = input
    voiceStoppedByLimitRef.current = false
    setVoiceElapsedMs(0)
    setVoiceStatus('requesting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedVoiceMimeType(MediaRecorder.isTypeSupported.bind(MediaRecorder))
      const recorderOptions = mimeType ? { mimeType } : {}
      const recorder = new MediaRecorder(stream, recorderOptions)

      voiceChunksRef.current = []
      voiceStartedAtRef.current = Date.now()
      voiceStreamRef.current = stream
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) voiceChunksRef.current.push(event.data)
      }

      recorder.onstop = async () => {
        const rawDurationMs = Date.now() - voiceStartedAtRef.current
        const limitReached =
          voiceStoppedByLimitRef.current || rawDurationMs >= AI_VOICE_LIMITS.maxDurationMs - 250
        voiceStoppedByLimitRef.current = limitReached
        const durationMs = normalizeVoiceRecordingDuration({
          durationMs: rawDurationMs,
          stoppedByLimit: voiceStoppedByLimitRef.current,
        })
        const audioBlob = new Blob(voiceChunksRef.current, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        })
        const validation = validateVoiceRecording({ durationMs, size: audioBlob.size })

        if (!validation.ok) {
          if (insertVoiceDraftFallback()) {
            cleanupVoiceRecording()
            return
          }
          setVoiceError(validation.error)
          setVoiceStatus('error')
          cleanupVoiceRecording()
          return
        }

        try {
          setVoiceStatus('transcribing')
          const transcription = await transcribeVoiceInput({
            audioBlob,
            lang: 'auto',
            storeSlug: activeStoreSlug,
            durationMs,
          })
          insertVoiceText(transcription.text)
          setVoiceDraft('')
          voiceDraftRef.current = ''
          setVoiceStatus('inserted')
          window.setTimeout(() => setVoiceStatus('idle'), 1800)
        } catch (error) {
          if (!insertVoiceDraftFallback()) {
            setVoiceError(error?.message || 'transcription_failed')
            setVoiceStatus('error')
          }
        } finally {
          cleanupVoiceRecording()
        }
      }

      recorder.start(1000)
      setRecording(true)
      setVoiceStatus('recording')
      startVoiceMeter(stream)
      startVoiceDraftRecognition()
      voiceTickTimerRef.current = window.setInterval(() => {
        setVoiceElapsedMs(Date.now() - voiceStartedAtRef.current)
      }, 250)
      if (!voicePrivacySeen) {
        window.localStorage.setItem(VOICE_PRIVACY_KEY, 'true')
        setVoicePrivacySeen(true)
      }
      voiceStopTimerRef.current = window.setTimeout(
        () => stopVoiceRecording({ stoppedByLimit: true }),
        AI_VOICE_LIMITS.maxDurationMs
      )
    } catch {
      cleanupVoiceRecording()
      setVoiceError('permission_denied')
      setVoiceStatus('error')
    }
  }

  const initialActionProcessed = useRef(false)
  useEffect(() => {
    if (initialActionProcessed.current) return
    if (location.state?.openImagePicker || location.state?.openCamera) {
      initialActionProcessed.current = true
      setImagePickerOpen(true)
    } else if (location.state?.startVoice) {
      initialActionProcessed.current = true
      startVoiceRecording()
    }
  }, [location.state])

  const sendMessage = async (text, { image = null } = {}) => {
    const cleanText = text.trim()
    if ((!cleanText && !image) || loading) return
    const messageText = cleanText || t('ai.image.defaultPrompt')
    const userMsg = { role: 'user', content: messageText }
    const newMessages = [...visibleMessages, userMsg]
    setMessages(newMessages)
    setMessagesStoreSlug(activeStoreSlug)
    setInput('')
    clearStoredAIDraft(activeStoreSlug)
    if (image) {
      setSelectedImage(null)
      setImageError('')
      setImagePickerOpen(false)
    }
    setLoading(true)
    try {
      let response
      if (image) {
        response = await askPackageImageAI({
          image: {
            dataUrl: image.dataUrl,
            mimeType: image.mimeType,
            sizeBytes: image.sizeBytes,
          },
          message: messageText,
          lang,
          storeContext,
          profile,
        })
      } else {
        const candidates = findCatalogCandidates(messageText, catalogProducts, profile, {
          limit: 20,
        })
        const catalogContext = buildCatalogAIContext(candidates, { maxItems: 20 })
        response = await askGeneralAI(newMessages, lang, storeContext, profile, catalogContext)
      }
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
    } catch (error) {
      if (image) setImageError(error?.message || 'image_ai_failed')
      setMessages((prev) => [...prev, { role: 'assistant', content: t('ai.errorGeneric') }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={screenRef} className="ai-screen">
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
        <div className="ai-header__actions">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="ai-icon-button"
            aria-label={t('ai.history.open')}
            title={t('ai.history.open')}
          >
            <HistoryIcon size={22} />
          </button>
          {visibleMessages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="ai-icon-button"
              aria-label={t('ai.clearChat')}
              title={t('ai.clearChat')}
            >
              <TrashIcon size={20} />
            </button>
          )}
        </div>
      </div>
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {historyOpen && (
              <>
                <motion.div
                  key="ai-history-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="ai-history-backdrop"
                  onClick={() => setHistoryOpen(false)}
                />
                <motion.section
                  key="ai-history-sheet"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={0.15}
                  onDragEnd={(event, info) => {
                    if (info.offset.y > 100 || info.velocity.y > 500) setHistoryOpen(false)
                  }}
                  className="ai-history-sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="ai-history-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="ai-history-sheet__handle" />
                  <div className="ai-history-sheet__head">
                    <div>
                      <h2 id="ai-history-title" className="ai-history-sheet__title">
                        {t('ai.history.title')}
                      </h2>
                      <p className="ai-history-sheet__subtitle">{t('ai.history.subtitle')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHistoryOpen(false)}
                      className="ai-history-close"
                      aria-label={t('ai.history.close')}
                    >
                      <CloseIcon size={18} />
                    </button>
                  </div>

                  <div className="ai-history-actions">
                    <button
                      type="button"
                      onClick={() => startNewChat()}
                      className="ai-history-primary"
                    >
                      <PlusIcon size={18} />
                      {t('ai.history.newChat')}
                    </button>
                    {historyItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setClearConfirming((current) => !current)}
                        className="ai-history-secondary ai-history-danger"
                      >
                        {clearConfirming ? t('ai.history.cancel') : t('ai.history.clearAll')}
                      </button>
                    )}
                  </div>

                  {clearConfirming && (
                    <div className="ai-history-confirm">
                      <span>{t('ai.history.clearAllConfirm')}</span>
                      <button
                        type="button"
                        onClick={confirmClearStoreHistory}
                        className="ai-history-confirm__button ai-history-danger"
                      >
                        {t('ai.history.confirmClear')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setClearConfirming(false)}
                        className="ai-history-confirm__button"
                      >
                        {t('ai.history.cancel')}
                      </button>
                    </div>
                  )}

                  <div className="ai-history-list">
                    {historyLoading ? (
                      <div className="ai-history-empty">{t('ai.history.loading')}</div>
                    ) : historyItems.length === 0 ? (
                      <div className="ai-history-empty">
                        <span className="material-symbols-outlined ai-history-empty__icon">
                          forum
                        </span>
                        <strong>{t('ai.history.emptyTitle')}</strong>
                        <span>{t('ai.history.emptyText')}</span>
                      </div>
                    ) : (
                      historyItems.map((item) => (
                        <div key={item.id} className="ai-history-item">
                          <button
                            type="button"
                            onClick={() => openConversation(item.id)}
                            className="ai-history-item__main"
                          >
                            <span className="ai-history-item__title">{item.title}</span>
                            {item.preview && (
                              <span className="ai-history-item__preview">{item.preview}</span>
                            )}
                            <span className="ai-history-item__meta">
                              {formatHistoryDate(item.updatedAt, lang)} ·{' '}
                              {t('ai.history.messageCount', { count: item.messageCount })}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDeleteConversation(item.id)}
                            className="ai-history-item__delete"
                            aria-label={t('ai.history.delete')}
                          >
                            <TrashIcon size={18} />
                          </button>
                          {deleteCandidateId === item.id && (
                            <div className="ai-history-item__confirm">
                              <span>{t('ai.history.deleteConfirm')}</span>
                              <button
                                type="button"
                                onClick={() => confirmDeleteConversation(item.id)}
                                className="ai-history-confirm__button ai-history-danger"
                              >
                                {t('ai.history.confirmDelete')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteCandidateId(null)}
                                className="ai-history-confirm__button"
                              >
                                {t('ai.history.cancel')}
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.section>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
      <div className="ai-scroll">
        {visibleMessages.length === 0 && (
          <div className="ai-empty-state">
            <div className="ai-empty-panel">
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
            <div className="ai-capability-carousel" aria-label={t('ai.empty.title')}>
              {GENERAL_AI_CAPABILITIES.map((capability) => {
                const capIcons = {
                  find_product: SearchIcon,
                  budget_pick: WalletIcon,
                  explain_composition: FlaskIcon,
                  build_shopping_list: CartIcon,
                }
                const CapIcon = capIcons[capability.id] || SearchIcon
                return (
                  <button
                    key={capability.id}
                    type="button"
                    className={`ai-capability-card ai-capability-card--${capability.tone}`}
                    onClick={() => sendMessage(t(capability.promptKey))}
                    disabled={loading}
                  >
                    <span className="ai-capability-card__icon">
                      <CapIcon size={20} />
                    </span>
                    <span className="ai-capability-card__content">
                      <span className="ai-capability-card__title">{t(capability.titleKey)}</span>
                      <span className="ai-capability-card__description">
                        {t(capability.descriptionKey)}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {visibleMessages.map((msg, i) => (
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
      <div ref={composerRef} className="ai-composer">
        <div className={`ai-composer__dock${composerExpanded ? ' is-expanded' : ''}`}>
          {imageError && (
            <div
              className="ai-image-status ai-image-status--error"
              role="status"
              aria-live="polite"
            >
              {getImageErrorText(imageError)}
            </div>
          )}
          {imagePickerOpen && (
            <div className="ai-image-picker" role="group" aria-label={t('ai.image.open')}>
              <button
                type="button"
                className="ai-image-picker__option"
                onClick={() => cameraInputRef.current?.click()}
              >
                <span className="ai-image-picker__icon">
                  <CameraIcon size={18} />
                </span>
                {t('ai.image.camera')}
              </button>
              <button
                type="button"
                className="ai-image-picker__option"
                onClick={() => galleryInputRef.current?.click()}
              >
                <span className="ai-image-picker__icon">
                  <GalleryIcon size={18} />
                </span>
                {t('ai.image.gallery')}
              </button>
            </div>
          )}
          {selectedImage && (
            <div className="ai-image-preview">
              <img
                src={selectedImage.previewUrl}
                alt={t('ai.image.previewAlt')}
                className="ai-image-preview__thumb"
              />
              <div className="ai-image-preview__body">
                <div className="ai-image-preview__title">{t('ai.image.ready')}</div>
                <div className="ai-image-preview__text">{t('ai.image.privacyNotice')}</div>
              </div>
              <button
                type="button"
                className="ai-image-preview__remove"
                onClick={removeSelectedImage}
                aria-label={t('ai.image.remove')}
                title={t('ai.image.remove')}
              >
                <span className="material-symbols-outlined ai-image-preview__remove-icon">
                  close
                </span>
              </button>
            </div>
          )}
          <input
            ref={cameraInputRef}
            data-testid="ai-image-camera-input"
            type="file"
            accept={imageAccept}
            capture="environment"
            className="ai-image-input-hidden"
            onChange={handleImageFileSelected}
          />
          <input
            ref={galleryInputRef}
            data-testid="ai-image-gallery-input"
            type="file"
            accept={imageAccept}
            className="ai-image-input-hidden"
            onChange={handleImageFileSelected}
          />
          {(recording ||
            voiceStatus === 'requesting' ||
            voiceStatus === 'uploading' ||
            voiceStatus === 'transcribing') && (
            <div
              className={`ai-voice-panel ai-voice-panel--${voiceProcessing ? 'processing' : 'recording'}`}
              role="status"
              aria-live="polite"
            >
              <div className="ai-voice-panel__top">
                <span className="ai-voice-panel__pulse" />
                <span className="ai-voice-panel__label">{getVoicePanelLabel()}</span>
                <span className="ai-voice-panel__time">{formatVoiceTime(voiceElapsedMs)}</span>
              </div>
              <div className="ai-voice-wave" aria-hidden="true">
                {Array.from({ length: 12 }, (_, index) => {
                  const dist = Math.abs(index - 5.5)
                  const active = voiceLevel > (dist / 6) * 0.75
                  return (
                    <span
                      key={index}
                      className={`ai-voice-wave__bar${active ? ' is-active' : ''}`}
                    />
                  )
                })}
              </div>
              {voiceProcessing && <div className="ai-voice-panel__progress" aria-hidden="true" />}
              {voiceDraft && <div className="ai-voice-draft">{voiceDraft}</div>}
            </div>
          )}
          {(voiceStatus !== 'idle' || voiceError) && !recording && voiceStatus !== 'requesting' && (
            <div
              className={`ai-voice-status ai-voice-status--${voiceError ? 'error' : voiceStatus}`}
              role="status"
              aria-live="polite"
            >
              {voiceError
                ? getVoiceErrorText(voiceError)
                : voiceStatus === 'inserted'
                  ? t('ai.voice.inserted')
                  : voiceStatus === 'draft_inserted'
                    ? t('ai.voice.draftInserted')
                    : voiceStatus === 'transcribing' || voiceStatus === 'uploading'
                      ? t('ai.voice.transcribing')
                      : ''}
            </div>
          )}
          <div className="ai-composer__row">
            <button
              type="button"
              onClick={() => setImagePickerOpen((current) => !current)}
              disabled={loading}
              className={`ai-image-button${selectedImage ? ' has-image' : ''}`}
              aria-label={t('ai.image.open')}
              title={t('ai.image.open')}
            >
              <span className="ai-image-button__icon">
                <IconGallery size={18} />
              </span>
            </button>
            <span className="ai-composer__divider" aria-hidden="true" />
            <textarea
              ref={composerInputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(input, { image: selectedImage })
                }
              }}
              placeholder={t('ai.inputGeneral')}
              disabled={loading}
              rows={1}
              className="ai-composer__input"
            />
            <div className="ai-composer__actions-right">
              <button
                type="button"
                onClick={recording ? stopVoiceRecording : startVoiceRecording}
                disabled={loading || voiceProcessing}
                className={`ai-voice-button${recording ? ' is-recording' : ''}${voiceProcessing ? ' is-processing' : ''}`}
                aria-label={
                  voiceProcessing
                    ? getVoicePanelLabel()
                    : t(recording ? 'ai.voice.stop' : 'ai.voice.start')
                }
                title={
                  voiceProcessing
                    ? getVoicePanelLabel()
                    : t(recording ? 'ai.voice.stop' : 'ai.voice.start')
                }
              >
                {voiceProcessing ? (
                  <span className="material-symbols-outlined ai-voice-button__icon">
                    progress_activity
                  </span>
                ) : recording ? (
                  // 'stop'
                  <StopSquareIcon size={16} />
                ) : (
                  <MicrophoneIcon size={18} />
                )}
              </button>
              <button
                type="button"
                onClick={() => sendMessage(input, { image: selectedImage })}
                disabled={loading || (!input.trim() && !selectedImage)}
                className="ai-composer__send"
                aria-label={t('ai.send')}
              >
                <SendIcon size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
