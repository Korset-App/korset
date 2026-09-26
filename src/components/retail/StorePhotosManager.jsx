import { useState, useRef, useMemo } from 'react'
import { useI18n } from '../../i18n/index.js'
import { supabase } from '../../utils/supabase.js'
import { compressImage } from '../../utils/imageCompressor.js'
import {
  StorefrontIcon,
  SelfCheckoutIcon,
  InventoryIcon,
  BakeryTandyrIcon,
  CameraIcon,
  UploadFileIcon,
  TrashIcon,
  EyeIcon,
  CloseIcon,
  PlusIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  SyncIcon,
  ChevronDownIcon,
} from '../icons/index.js'

const MAX_PHOTOS = 12

export const DEFAULT_ZONES = [
  {
    key: 'facade',
    labelKey: 'retail.settings.zoneFacade',
    defaultLabelRu: 'Фасад и главный вход',
    defaultLabelKz: 'Қасбеті және басты кіреберіс',
    hintRu: 'Вывеска, вход с улицы',
    hintKz: 'Маңдайша, көшеден кіреберіс',
    Icon: StorefrontIcon,
  },
  {
    key: 'checkout',
    labelKey: 'retail.settings.zoneCheckout',
    defaultLabelRu: 'Зона касс',
    defaultLabelKz: 'Касса аймағы',
    hintRu: 'Кассы, зона оплаты',
    hintKz: 'Кассалар, төлем аймағы',
    Icon: SelfCheckoutIcon,
  },
  {
    key: 'interior',
    labelKey: 'retail.settings.zoneInterior',
    defaultLabelRu: 'Торговый зал',
    defaultLabelKz: 'Сауда залы',
    hintRu: 'Проходы, витрины и ряды',
    hintKz: 'Қатарлар, сөрелер мен өтпелер',
    Icon: InventoryIcon,
  },
  {
    key: 'produce',
    labelKey: 'retail.settings.zoneProduce',
    defaultLabelRu: 'Овощи и фрукты',
    defaultLabelKz: 'Көкөністер мен жемістер',
    hintRu: 'Свежая витрина',
    hintKz: 'Жаңа піскен өнімдер сөресі',
    Icon: CameraIcon,
  },
  {
    key: 'bakery',
    labelKey: 'retail.settings.zoneBakery',
    defaultLabelRu: 'Выпечка и кулинария',
    defaultLabelKz: 'Нан-тоқаш және кулинария',
    hintRu: 'Свежий хлеб, готовая еда',
    hintKz: 'Ыстық нан, дайын тағамдар',
    Icon: BakeryTandyrIcon,
  },
  {
    key: 'grocery',
    labelKey: 'retail.settings.zoneGrocery',
    defaultLabelRu: 'Напитки и бакалея',
    defaultLabelKz: 'Сусындар мен бакалея',
    hintRu: 'Стеллажи с напитками и бакалеей',
    hintKz: 'Сусындар мен бакалея сөрелері',
    Icon: InventoryIcon,
  },
]

export function normalizePhotoObject(item, idx, t) {
  if (!item) return null
  if (typeof item === 'string') {
    const zone = DEFAULT_ZONES[idx] || DEFAULT_ZONES[0]
    return {
      id: `photo_${idx}`,
      url: item,
      category: zone.key,
      label: t(zone.labelKey) || zone.defaultLabelRu,
      createdAt: null,
    }
  }
  return {
    id: item.id || `photo_${idx}`,
    url: item.url || item.image || item.src,
    category: item.category || 'interior',
    label: item.label || item.title || t('retail.settings.photoDefault') || 'Фото магазина',
    createdAt: item.createdAt || null,
  }
}

function buildStoragePath(storeId, zoneKey, ext) {
  const rand = Math.random().toString(36).slice(2, 9)
  return `${storeId}/${zoneKey}_${Date.now()}_${rand}.${ext}`
}

function makePhotoRecord(publicUrl, zoneKey, label) {
  const rand = Math.random().toString(36).slice(2, 9)
  return {
    id: `photo_${Date.now()}_${rand}`,
    url: publicUrl,
    category: zoneKey,
    label,
    createdAt: new Date().toISOString(),
  }
}

export default function StorePhotosManager({
  storeId,
  images = [],
  onChange,
  onAutoSave,
  disabled: _disabled = false,
}) {
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'
  const [isExpanded, setIsExpanded] = useState(false)
  const [uploadingZoneKey, setUploadingZoneKey] = useState(null)
  const [activePreviewUrl, setActivePreviewUrl] = useState(null)
  const [isAddingCustom, setIsAddingCustom] = useState(false)
  const [customZoneName, setCustomZoneName] = useState('')
  const [uploadError, setUploadError] = useState(null)

  const activeFileInputRef = useRef(null)
  const targetZoneRef = useRef(null)

  // Normalize list to ensure every photo is an object
  const normalizedList = useMemo(() => {
    return (Array.isArray(images) ? images : [])
      .map((item, idx) => normalizePhotoObject(item, idx, t))
      .filter((p) => Boolean(p?.url))
  }, [images, t])

  const photoCount = normalizedList.length
  const isRecommendedMet = photoCount >= 3

  // Map each standard zone to its current photo(s)
  const zonePhotoMap = useMemo(() => {
    const map = {}
    DEFAULT_ZONES.forEach((z) => {
      map[z.key] = []
    })
    map.custom = []

    normalizedList.forEach((photo) => {
      if (map[photo.category]) {
        map[photo.category].push(photo)
      } else {
        map.custom.push(photo)
      }
    })
    return map
  }, [normalizedList])

  const triggerUploadForZone = (zoneKey, customLabel = null) => {
    if (photoCount >= MAX_PHOTOS) {
      alert(
        t('retail.settings.imagesLimitReached') || `Достигнут лимит: максимум ${MAX_PHOTOS} фото`
      )
      return
    }
    targetZoneRef.current = { zoneKey, customLabel }
    if (activeFileInputRef.current) {
      activeFileInputRef.current.value = ''
      activeFileInputRef.current.click()
    }
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !storeId || !targetZoneRef.current) return

    const { zoneKey, customLabel } = targetZoneRef.current
    const ALLOWED = ['image/png', 'image/jpeg', 'image/webp']
    if (!ALLOWED.includes(file.type)) {
      alert(t('retail.settings.logoFormatError') || 'Формат файла не поддерживается')
      return
    }

    setUploadingZoneKey(zoneKey)
    setUploadError(null)

    try {
      // 1. Client-side WebP compression (1200x1200 max, 0.82 quality)
      let compressedFile = file
      try {
        compressedFile = await compressImage(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.82,
        })
      } catch (err) {
        console.warn('Store photo compression fallback', err)
      }

      // 2. Upload to Supabase Storage bucket 'store-images'
      const ext = compressedFile.type === 'image/webp' ? 'webp' : 'jpg'
      const path = buildStoragePath(storeId, zoneKey, ext)

      const { error: storageError } = await supabase.storage
        .from('store-images')
        .upload(path, compressedFile, {
          upsert: true,
          contentType: compressedFile.type || 'image/webp',
        })

      if (storageError) {
        throw storageError
      }

      // 3. Obtain public URL
      const { data: urlData } = supabase.storage.from('store-images').getPublicUrl(path)
      const publicUrl = urlData?.publicUrl
      if (!publicUrl) {
        throw new Error('Could not retrieve public URL')
      }

      // 4. Resolve zone label
      let label = customLabel
      if (!label) {
        const standard = DEFAULT_ZONES.find((z) => z.key === zoneKey)
        label = standard
          ? t(standard.labelKey) || (isKz ? standard.defaultLabelKz : standard.defaultLabelRu)
          : t('retail.settings.photoDefault') || 'Фото магазина'
      }

      const newPhoto = makePhotoRecord(publicUrl, zoneKey, label)

      // If zone already has a photo and is a single-photo standard zone, replace it, otherwise append
      let nextList = [...normalizedList]
      const existingIdx = nextList.findIndex((p) => p.category === zoneKey && zoneKey !== 'custom')
      if (existingIdx >= 0) {
        nextList[existingIdx] = newPhoto
      } else {
        nextList.push(newPhoto)
      }

      onChange?.(nextList)
      if (onAutoSave) {
        await onAutoSave(nextList)
      }
    } catch (err) {
      console.error('Failed to upload store photo:', err)
      setUploadError(err.message || 'Ошибка загрузки фотографии')
      alert(t('retail.settings.logoUploadError') || 'Не удалось загрузить фото')
    } finally {
      setUploadingZoneKey(null)
      targetZoneRef.current = null
      if (activeFileInputRef.current) activeFileInputRef.current.value = ''
    }
  }

  const handleDeletePhoto = async (photoId) => {
    const nextList = normalizedList.filter((p) => p.id !== photoId)
    onChange?.(nextList)
    if (onAutoSave) {
      await onAutoSave(nextList)
    }
  }

  const handleConfirmCustomZone = () => {
    const trimmed = customZoneName.trim()
    if (!trimmed) return
    setIsAddingCustom(false)
    setCustomZoneName('')
    triggerUploadForZone('custom', trimmed)
  }

  return (
    <div>
      {/* Hidden input for camera / file picker */}
      <input
        ref={activeFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      {/* Header section label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          paddingLeft: 4,
          paddingRight: 4,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {t('retail.settings.imagesTitle') || 'ФОТОГРАФИИ МАГАЗИНА'}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: isRecommendedMet ? 'var(--primary-bright, #38BDF8)' : '#F59E0B',
            background: isRecommendedMet ? 'rgba(56,189,248,0.1)' : 'rgba(245,158,11,0.1)',
            padding: '2px 8px',
            borderRadius: 8,
          }}
        >
          {photoCount} / {MAX_PHOTOS}
        </span>
      </div>

      {/* Main Container Card */}
      <div
        style={{
          background: 'var(--glass-subtle)',
          border: '1px solid var(--glass-soft-border)',
          borderRadius: 16,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* Status / Recommendation Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 12,
            background: isRecommendedMet ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
            border: `1px solid ${
              isRecommendedMet ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'
            }`,
          }}
        >
          {isRecommendedMet ? (
            <CheckCircleIcon size={18} color="#10B981" />
          ) : (
            <AlertTriangleIcon size={18} color="#F59E0B" />
          )}
          <div style={{ flex: 1, fontSize: 12, lineHeight: 1.4, color: 'var(--text)' }}>
            {isRecommendedMet
              ? t('retail.settings.imagesOptimalHint') ||
                'Витрина магазина заполнена фото ключевых зон.'
              : t('retail.settings.imagesMinimumHint') ||
                'Рекомендуем добавить минимум 3 фото (фасад, касса, зал), чтобы витрина вызывала доверие.'}
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--retail-accent, #38BDF8)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 6px',
            }}
          >
            {isExpanded
              ? t('retail.settings.collapsePhotos') || 'Свернуть'
              : t('retail.settings.managePhotos') || 'Управление'}
            <ChevronDownIcon
              size={16}
              style={{
                transform: isExpanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </button>
        </div>

        {uploadError && (
          <div
            style={{
              fontSize: 12,
              color: '#EF4444',
              background: 'rgba(239, 68, 68, 0.1)',
              padding: '8px 12px',
              borderRadius: 8,
            }}
          >
            {uploadError}
          </div>
        )}

        {/* Collapsed Compact View: horizontal preview strip */}
        {!isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {photoCount > 0 ? (
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  overflowX: 'auto',
                  paddingBottom: 4,
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {normalizedList.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => setActivePreviewUrl(photo.url)}
                    style={{
                      position: 'relative',
                      width: 80,
                      height: 80,
                      flexShrink: 0,
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: '1px solid var(--glass-soft-border)',
                      cursor: 'pointer',
                      background: 'var(--input-bg)',
                    }}
                  >
                    <img
                      src={photo.url}
                      alt={photo.label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '2px 4px',
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                        color: '#fff',
                        fontSize: 9,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {photo.label}
                    </div>
                  </div>
                ))}

                {photoCount < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    style={{
                      width: 80,
                      height: 80,
                      flexShrink: 0,
                      borderRadius: 12,
                      border: '1px dashed var(--glass-strong-border)',
                      background: 'var(--glass-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      color: 'var(--text-sub)',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    <PlusIcon size={18} color="var(--retail-accent, #38BDF8)" />
                    <span>{t('retail.settings.addPhotoShort') || 'Добавить'}</span>
                  </button>
                )}
              </div>
            ) : (
              <div
                style={{
                  padding: '16px',
                  borderRadius: 12,
                  border: '1px dashed var(--glass-strong-border)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CameraIcon size={28} color="var(--text-dim)" />
                <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>
                  {t('retail.settings.noPhotosYet') || 'Фотографии магазина пока не добавлены'}
                </div>
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    background: 'rgba(56,189,248,0.12)',
                    border: '1px solid rgba(56,189,248,0.25)',
                    color: 'var(--retail-accent, #38BDF8)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <PlusIcon size={16} />
                  {t('retail.settings.startAddPhotos') || 'Заполнить зоны магазина'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Expanded Full View: Grid of template zones */}
        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 12,
              }}
            >
              {DEFAULT_ZONES.map((zone) => {
                const photosInZone = zonePhotoMap[zone.key] || []
                const currentPhoto = photosInZone[0]
                const isUploadingThis = uploadingZoneKey === zone.key
                const ZoneIcon = zone.Icon
                const label = t(zone.labelKey) || (isKz ? zone.defaultLabelKz : zone.defaultLabelRu)
                const hint = isKz ? zone.hintKz : zone.hintRu

                return (
                  <div
                    key={zone.key}
                    style={{
                      borderRadius: 14,
                      border: currentPhoto
                        ? '1px solid var(--glass-soft-border)'
                        : '1px dashed var(--glass-strong-border)',
                      overflow: 'hidden',
                      background: 'var(--input-bg)',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                    }}
                  >
                    {/* Visual box */}
                    <div
                      style={{
                        position: 'relative',
                        aspectRatio: '4/3',
                        background: 'rgba(0,0,0,0.15)',
                        overflow: 'hidden',
                      }}
                    >
                      {currentPhoto ? (
                        <>
                          <img
                            src={currentPhoto.url}
                            alt={label}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: 6,
                              right: 6,
                              display: 'flex',
                              gap: 4,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setActivePreviewUrl(currentPhoto.url)}
                              title={t('retail.settings.viewPhoto') || 'Просмотреть'}
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 7,
                                background: 'rgba(15,23,42,0.75)',
                                backdropFilter: 'blur(4px)',
                                border: 'none',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <EyeIcon size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(currentPhoto.id)}
                              title={t('retail.settings.deletePhoto') || 'Удалить'}
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 7,
                                background: 'rgba(239,68,68,0.85)',
                                backdropFilter: 'blur(4px)',
                                border: 'none',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <TrashIcon size={14} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div
                          onClick={() => triggerUploadForZone(zone.key)}
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            cursor: isUploadingThis ? 'wait' : 'pointer',
                            color: 'var(--text-dim)',
                            padding: 8,
                            textAlign: 'center',
                          }}
                        >
                          {isUploadingThis ? (
                            <SyncIcon size={24} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <>
                              <ZoneIcon size={24} color="var(--text-sub)" />
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: 'var(--retail-accent, #38BDF8)',
                                }}
                              >
                                + {t('retail.settings.addPhotoShort') || 'Загрузить'}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Zone Info Footer */}
                    <div
                      style={{
                        padding: '8px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {label}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{hint}</div>

                      {currentPhoto && (
                        <button
                          type="button"
                          disabled={isUploadingThis}
                          onClick={() => triggerUploadForZone(zone.key)}
                          style={{
                            marginTop: 4,
                            padding: '4px 8px',
                            borderRadius: 6,
                            background: 'rgba(56,189,248,0.1)',
                            border: '1px solid rgba(56,189,248,0.2)',
                            color: 'var(--retail-accent, #38BDF8)',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                          }}
                        >
                          {isUploadingThis ? (
                            <SyncIcon size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <UploadFileIcon size={12} />
                          )}
                          {t('retail.settings.replacePhoto') || 'Заменить'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Custom uploaded photos list */}
              {zonePhotoMap.custom.map((customPhoto) => (
                <div
                  key={customPhoto.id}
                  style={{
                    borderRadius: 14,
                    border: '1px solid var(--glass-soft-border)',
                    overflow: 'hidden',
                    background: 'var(--input-bg)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      aspectRatio: '4/3',
                      background: 'rgba(0,0,0,0.15)',
                    }}
                  >
                    <img
                      src={customPhoto.url}
                      alt={customPhoto.label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4 }}
                    >
                      <button
                        type="button"
                        onClick={() => setActivePreviewUrl(customPhoto.url)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 7,
                          background: 'rgba(15,23,42,0.75)',
                          border: 'none',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <EyeIcon size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(customPhoto.id)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 7,
                          background: 'rgba(239,68,68,0.85)',
                          border: 'none',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {customPhoto.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                      {t('retail.settings.customZone') || 'Своя зона'}
                    </div>
                  </div>
                </div>
              ))}

              {/* Button to add a new Custom Zone */}
              {photoCount < MAX_PHOTOS && (
                <div
                  style={{
                    borderRadius: 14,
                    border: '1px dashed var(--glass-strong-border)',
                    background: 'rgba(124, 58, 237, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 14,
                    minHeight: 140,
                    gap: 8,
                  }}
                >
                  {isAddingCustom ? (
                    <div
                      style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}
                    >
                      <input
                        type="text"
                        placeholder={
                          t('retail.settings.customZonePlaceholder') || 'Например: Халал-мясо'
                        }
                        value={customZoneName}
                        onChange={(e) => setCustomZoneName(e.target.value)}
                        autoFocus
                        maxLength={30}
                        style={{
                          width: '100%',
                          background: 'var(--input-bg)',
                          border: '1px solid var(--input-border)',
                          borderRadius: 8,
                          padding: '6px 8px',
                          color: 'var(--text)',
                          fontSize: 12,
                        }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setIsAddingCustom(false)}
                          style={{
                            flex: 1,
                            padding: '6px',
                            borderRadius: 6,
                            border: '1px solid var(--glass-border)',
                            background: 'transparent',
                            color: 'var(--text-dim)',
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          {t('retail.settings.cancel') || 'Отмена'}
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmCustomZone}
                          disabled={!customZoneName.trim()}
                          style={{
                            flex: 1,
                            padding: '6px',
                            borderRadius: 6,
                            border: 'none',
                            background: 'var(--retail-accent, #38BDF8)',
                            color: '#07070F',
                            fontWeight: 600,
                            fontSize: 11,
                            cursor: customZoneName.trim() ? 'pointer' : 'default',
                            opacity: customZoneName.trim() ? 1 : 0.5,
                          }}
                        >
                          {t('retail.settings.nextPhoto') || 'Далее'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingCustom(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        color: 'var(--text-sub)',
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: 'rgba(124, 58, 237, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#A78BFA',
                        }}
                      >
                        <PlusIcon size={20} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#A78BFA' }}>
                        + {t('retail.settings.addCustomZone') || 'Своя зона'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'center' }}>
                        {t('retail.settings.addCustomZoneHint') || 'Мясо, сладости, игрушки'}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Photo Lightbox Modal */}
      {activePreviewUrl && (
        <div
          onClick={() => setActivePreviewUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1100,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: 600,
              maxHeight: '90dvh',
              borderRadius: 16,
              overflow: 'hidden',
              background: '#07070F',
              boxShadow: '0 20px 48px rgba(0,0,0,0.6)',
            }}
          >
            <img
              src={activePreviewUrl}
              alt="preview"
              style={{
                width: '100%',
                maxHeight: '80dvh',
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <button
              type="button"
              onClick={() => setActivePreviewUrl(null)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 32,
                height: 32,
                borderRadius: 16,
                background: 'rgba(0,0,0,0.6)',
                border: 'none',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <CloseIcon size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
