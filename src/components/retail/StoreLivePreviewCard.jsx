import { useMemo } from 'react'
import { useI18n } from '../../i18n/index.js'
import ProfileAvatar from '../ProfileAvatar.jsx'
import { LocationPinIcon, ClockIcon, PhoneCallIcon, SparklesIcon } from '../icons/index.js'
import { getStoreTypeLabel } from '../../domain/retail/storeSettings.js'
import { parseStoreSchedule } from '../../domain/stores/schedule.js'

export default function StoreLivePreviewCard({ settings, logoUrl, phones = [], storeSlug = '' }) {
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'

  const storeName = settings?.name || (isKz ? 'Дүкен атауы' : 'Название магазина')
  const storeType = settings?.type || 'minimarket'
  const storeAddress = settings?.address || (isKz ? 'Дүкен мекенжайы көрсетілмеген' : 'Адрес магазина ещё не указан')
  const storeHours = settings?.opening_hours || '09:00 - 22:00'
  const shortDesc =
    settings?.short_description ||
    (isKz ? 'Сатып алушыларға арналған дүкеннің қысқаша сипаттамасы' : 'Здесь будет краткое описание магазина для покупателей')
  const isPublished = settings?.is_published !== false

  const typeLabel = getStoreTypeLabel(storeType, t, lang)

  // Real-time schedule evaluation based on Kazakhstan time
  const scheduleInfo = useMemo(() => {
    try {
      return parseStoreSchedule({
        opening_hours: storeHours,
        temporary_closure: settings?.temporary_closure,
      })
    } catch {
      return { isOpen: null }
    }
  }, [storeHours, settings?.temporary_closure])

  const physicalStatusText = useMemo(() => {
    if (scheduleInfo.isTemporarilyClosed) {
      return isKz ? 'Жабық (ревизия)' : 'Закрыто (ревизия)'
    }
    if (scheduleInfo.isOpen === true) {
      if (scheduleInfo.closes) {
        return isKz ? `Ашық · ${scheduleInfo.closes}-ге дейін` : `Открыто · до ${scheduleInfo.closes}`
      }
      return isKz ? 'Ашық' : 'Открыто'
    }
    if (scheduleInfo.isOpen === false) {
      if (scheduleInfo.opens) {
        return isKz ? `Жабық · ${scheduleInfo.opens}-де ашылады` : `Закрыто · откроется в ${scheduleInfo.opens}`
      }
      return isKz ? 'Жабық' : 'Закрыто'
    }
    return isKz ? 'Жұмыс уақыты' : 'Режим работы'
  }, [scheduleInfo, isKz])

  const primaryPhone = useMemo(() => {
    const p =
      phones?.find((item) => item.role === 'main')?.number || phones?.[0]?.number || settings?.phone
    return p ? `+7 ${p}` : null
  }, [phones, settings?.phone])

  const catalogHref = storeSlug ? `/s/${storeSlug}/catalog` : null

  return (
    <div className="store-live-preview" role="region" aria-label="Live customer preview">
      {/* Header Badge */}
      <div className="store-live-preview__header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div className="store-live-preview__badge">
            <span className="store-live-preview__pulse-dot" />
            <span className="store-live-preview__badge-text">
              {t('retail.desktop.livePreviewTitle') || (isKz ? 'Тікелей алдын ала қарау' : 'Живой предпросмотр витрины')}
            </span>
          </div>

          {/* Explicit Platform Publication Status */}
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 6,
              background: isPublished ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              color: isPublished ? 'var(--success-bright, #10b981)' : 'var(--warning, #f59e0b)',
              border: `1px solid ${isPublished ? 'rgba(16, 185, 129, 0.28)' : 'rgba(245, 158, 11, 0.28)'}`,
            }}
          >
            {isPublished
              ? isKz
                ? 'Желіде'
                : 'Опубликован'
              : isKz
                ? 'Черновик (жасырылған)'
                : 'Черновик (скрыт)'}
          </span>
        </div>

        <span className="store-live-preview__subtitle">
          {t('retail.desktop.livePreviewSub') || (isKz ? 'Сатып алушылар дүкенді каталогта осылай көреді' : 'Так покупатели видят магазин в мобильном каталоге')}
        </span>
      </div>

      {/* Simulated Phone Card Container */}
      <div className="store-live-preview__phone-mockup">
        {/* Store Banner / Cover */}
        <div className="store-live-preview__cover">
          <div className="store-live-preview__cover-gradient" />
          <div className="store-live-preview__type-pill">{typeLabel}</div>

          {/* Physical Hours Status (Separated from platform publish) */}
          <div className="store-live-preview__online-pill">
            <span
              className={`store-live-preview__status-dot ${
                scheduleInfo.isOpen === true ? 'online' : 'offline'
              }`}
            />
            <span>{physicalStatusText}</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="store-live-preview__body">
          {/* Logo & Name row */}
          <div className="store-live-preview__identity">
            <div className="store-live-preview__logo-wrap">
              <ProfileAvatar avatarId={logoUrl} name={storeName} rounded="circle" />
            </div>
            <div className="store-live-preview__names">
              <h3 className="store-live-preview__title" title={storeName}>
                {storeName}
              </h3>
              <p className="store-live-preview__short-desc">{shortDesc}</p>
            </div>
          </div>

          {/* Info Rows */}
          <div className="store-live-preview__details">
            {/* Address */}
            <div className="store-live-preview__row">
              <LocationPinIcon size={14} color="var(--retail-accent, #38bdf8)" />
              <span className="store-live-preview__row-text">{storeAddress}</span>
            </div>

            {/* Hours */}
            <div className="store-live-preview__row">
              <ClockIcon size={14} color="var(--success-bright, #10b981)" />
              <span className="store-live-preview__row-text">{storeHours}</span>
            </div>

            {/* Phone */}
            {primaryPhone && (
              <div className="store-live-preview__row">
                <PhoneCallIcon size={14} color="var(--text-sub)" />
                <span className="store-live-preview__row-text">{primaryPhone}</span>
              </div>
            )}
          </div>

          {/* Action Button: Interactive Catalog Link */}
          <div className="store-live-preview__action-bar">
            {catalogHref ? (
              <a
                href={catalogHref}
                target="_blank"
                rel="noopener noreferrer"
                className="store-live-preview__mock-btn"
                style={{ textDecoration: 'none' }}
              >
                <SparklesIcon size={13} color="var(--retail-accent)" />
                <span>{isKz ? 'Тауарлар каталогын қарау ↗' : 'Смотреть каталог товаров ↗'}</span>
              </a>
            ) : (
              <div className="store-live-preview__mock-btn">
                <SparklesIcon size={13} color="var(--retail-accent)" />
                <span>{isKz ? 'Тауарлар каталогын қарау' : 'Смотреть каталог товаров'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
