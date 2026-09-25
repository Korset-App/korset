import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../../i18n/index.js'
import { useOverlayLock } from '../../hooks/useOverlayLock.js'
import { CameraIcon } from '../icons/CameraIcon.jsx'
import { GalleryIcon } from '../icons/GalleryIcon.jsx'
import { CloseIcon } from '../icons/CloseIcon.jsx'
import { CheckCircleIcon } from '../icons/CheckCircleIcon.jsx'
import { submitProductData, CORRECTION_REASONS } from '../../domain/product/submissionService.js'
import './ProductSubmissionSheet.css'

function ProductSubmissionContent({
  onClose,
  mode = 'new_product',
  ean,
  product = null,
  storeSlug = null,
  onSuccess = null,
  playSuccessSound = null,
}) {
  const { lang, t } = useI18n()
  const isKz = lang === 'kz'

  const [photos, setPhotos] = useState([]) // Array<{ file: File, previewUrl: string, label: string }>
  const [reason, setReason] = useState(mode === 'correction' ? 'wrong_product' : 'other')
  const [priceKzt, setPriceKzt] = useState('')
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'compressing' | 'uploading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState(null)

  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl)
      })
    }
  }, [])

  const handleFiles = useCallback(
    (filesList) => {
      if (!filesList || filesList.length === 0) return
      const incoming = Array.from(filesList)
      setPhotos((prev) => {
        const remainingSlots = 4 - prev.length
        if (remainingSlots <= 0) return prev

        const toAdd = incoming.slice(0, remainingSlots).map((file, idx) => {
          const currentTotal = prev.length + idx
          let label = isKz ? 'Қосымша' : 'Детали'
          if (currentTotal === 0) label = isKz ? 'Алдыңғы' : 'Лицо'
          else if (currentTotal === 1) label = isKz ? 'Құрамы' : 'Состав'
          else if (currentTotal === 2) label = isKz ? 'Бүйірі' : 'Бок'

          return {
            file,
            previewUrl: URL.createObjectURL(file),
            label,
          }
        })
        return [...prev, ...toAdd]
      })
    },
    [isKz]
  )

  const handleCameraChange = (e) => {
    handleFiles(e.target.files)
    if (e.target) e.target.value = ''
  }

  const handleGalleryChange = (e) => {
    handleFiles(e.target.files)
    if (e.target) e.target.value = ''
  }

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => {
      const removed = prev[index]
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async () => {
    if (status === 'compressing' || status === 'uploading' || status === 'success') return

    setStatus('compressing')
    setErrorMessage(null)

    const result = await submitProductData({
      ean,
      storeSlug,
      type: mode,
      reason: mode === 'correction' ? reason : 'other',
      comment,
      priceKzt: priceKzt ? Number(priceKzt) : null,
      shownEan: product?.ean || null,
      shownProductId: product?.id || null,
      shownProductName: product?.name || null,
      files: photos.map((p) => p.file),
      onProgress: (step) => {
        if (step === 'compressing' || step === 'uploading') {
          setStatus(step)
        }
      },
    })

    if (result.ok) {
      setStatus('success')
      try {
        playSuccessSound?.()
      } catch {
        /* noop */
      }
      setTimeout(() => {
        onSuccess?.(result)
        onClose?.()
      }, 1200)
    } else {
      setStatus('error')
      const codeHint = result.errorCode ? ` [${result.errorCode}]` : ''
      const detail = result.error ? ` (${result.error})` : ''
      setErrorMessage(`${t('scan.submission.error')}${codeHint}${detail}`)
    }
  }

  const isCorrection = mode === 'correction'
  const isSubmitDisabled =
    status === 'compressing' ||
    status === 'uploading' ||
    status === 'success' ||
    (!isCorrection && photos.length === 0) ||
    (isCorrection && photos.length === 0 && !comment.trim())

  return (
    <>
      <div className="korset-sub-handle" />

      {/* Header */}
      <div className="korset-sub-header">
        <div className="korset-sub-title-row">
          <h3 className="korset-sub-title">
            {isCorrection ? t('scan.submission.titleCorrection') : t('scan.submission.titleNew')}
          </h3>
          <p className="korset-sub-subtitle">
            {isCorrection
              ? t('scan.submission.subtitleCorrection')
              : t('scan.submission.subtitleNew')}
          </p>
        </div>
        <button
          type="button"
          className="korset-sub-close-btn"
          onClick={onClose}
          aria-label={t('scan.close')}
        >
          <CloseIcon size={18} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="korset-sub-scrollable">
        {/* EAN and Product info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="korset-sub-ean-badge">EAN {ean}</span>
          {isCorrection && product?.name && (
            <span
              style={{
                fontSize: 13,
                color: 'var(--text-sub)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '60%',
              }}
            >
              {product.name}
            </span>
          )}
        </div>

        {/* Reasons chips (Only for Correction mode) */}
        {isCorrection && (
          <div>
            <div className="korset-sub-section-title">{t('scan.submission.reasonLabel')}</div>
            <div className="korset-sub-reasons-grid">
              {CORRECTION_REASONS.map((r) => {
                const isSelected = reason === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`korset-sub-reason-chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => setReason(r.id)}
                  >
                    {isKz ? r.labelKz : r.labelRu}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Photos Section */}
        <div className="korset-sub-photos-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="korset-sub-section-title" style={{ margin: 0 }}>
              {t('scan.submission.photoHint')}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-disabled)' }}>{photos.length}/4</span>
          </div>

          {/* Previews */}
          {photos.length > 0 && (
            <div className="korset-sub-photo-slots">
              {photos.map((item, idx) => (
                <div key={idx} className="korset-sub-photo-thumb">
                  <img src={item.previewUrl} alt={`Upload ${idx + 1}`} />
                  <button
                    type="button"
                    className="korset-sub-thumb-remove"
                    onClick={() => handleRemovePhoto(idx)}
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                  <div className="korset-sub-thumb-label">{item.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons: Camera & Gallery */}
          {photos.length < 4 && (
            <div className="korset-sub-photo-actions">
              <button
                type="button"
                className="korset-sub-action-btn"
                onClick={() => cameraInputRef.current?.click()}
              >
                <CameraIcon size={20} />
                <span>{t('scan.submission.takePhoto')}</span>
              </button>
              <button
                type="button"
                className="korset-sub-action-btn"
                onClick={() => galleryInputRef.current?.click()}
              >
                <GalleryIcon size={20} />
                <span>{t('scan.submission.chooseGallery')}</span>
              </button>
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleCameraChange}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleGalleryChange}
          />
        </div>

        {/* Price input (optional) */}
        {!isCorrection && (
          <div>
            <div className="korset-sub-section-title">{t('scan.submission.priceLabel')}</div>
            <input
              type="number"
              inputMode="numeric"
              className="korset-sub-input"
              placeholder={t('scan.submission.pricePlaceholder')}
              value={priceKzt}
              onChange={(e) => setPriceKzt(e.target.value)}
            />
          </div>
        )}

        {/* Comment / Notes */}
        <div>
          <div className="korset-sub-section-title">{t('scan.submission.commentLabel')}</div>
          <textarea
            className="korset-sub-textarea"
            placeholder={
              isCorrection
                ? isKz
                  ? 'Қате туралы жазыңыз (мысалы: 100г емес, 50г)'
                  : 'В чём ошибка (например: На самом деле это 50г, а не 100г)'
                : t('scan.submission.commentPlaceholder')
            }
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {/* Error text */}
        {errorMessage && <p className="korset-sub-error-text">{errorMessage}</p>}
      </div>

      {/* Footer / Submit Button */}
      <div className="korset-sub-footer">
        {!isCorrection && photos.length === 0 && (
          <p
            style={{
              margin: '0 0 8px 0',
              fontSize: 12,
              color: 'var(--text-sub)',
              textAlign: 'center',
            }}
          >
            {t('scan.submission.photoRequired')}
          </p>
        )}
        <button
          type="button"
          className="korset-sub-primary-btn"
          disabled={isSubmitDisabled}
          onClick={handleSubmit}
        >
          {status === 'compressing' ? (
            <>
              <div className="korset-sub-spinner" />
              <span>{t('scan.submission.compressing')}</span>
            </>
          ) : status === 'uploading' ? (
            <>
              <div className="korset-sub-spinner" />
              <span>{t('scan.submission.uploading')}</span>
            </>
          ) : status === 'success' ? (
            <>
              <CheckCircleIcon size={20} />
              <span>{t('scan.submission.success')}</span>
            </>
          ) : (
            <span>
              {isCorrection ? t('scan.submission.submitCorrection') : t('scan.submission.submit')}
            </span>
          )}
        </button>
      </div>
    </>
  )
}

export default function ProductSubmissionSheet({
  open,
  onClose,
  mode = 'new_product',
  ean,
  product = null,
  storeSlug = null,
  onSuccess = null,
  playSuccessSound = null,
}) {
  // Prevent background scroll when open
  useOverlayLock(open)

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="korset-sub-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            className="korset-sub-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <ProductSubmissionContent
              key={`${mode}_${ean || 'open'}`}
              onClose={onClose}
              mode={mode}
              ean={ean}
              product={product}
              storeSlug={storeSlug}
              onSuccess={onSuccess}
              playSuccessSound={playSuccessSound}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
