import { useMemo } from 'react'
import { useI18n } from '../../i18n/index.js'
import ProfileAvatar from '../ProfileAvatar.jsx'
import { LocationPinIcon, ClockIcon, PhoneCallIcon, SparklesIcon } from '../icons/index.js'

export default function StoreLivePreviewCard({ settings, logoUrl, phones = [] }) {
  const { t } = useI18n()

  const storeName = settings?.name || 'Название магазина'
  const storeType = settings?.type || 'minimarket'
  const storeAddress = settings?.address || 'Адрес магазина ещё не указан'
  const storeHours = settings?.opening_hours || '09:00 - 22:00'
  const shortDesc =
    settings?.short_description || 'Здесь будет краткое описание магазина для покупателей'
  const isPublished = settings?.is_published !== false

  const typeLabels = {
    minimarket: t('retail.settings.typeMinimarket') || 'Минимаркет',
    supermarket: t('retail.settings.typeSupermarket') || 'Супермаркет',
    hypermarket: t('retail.settings.typeHypermarket') || 'Гипермаркет',
    convenience: t('retail.settings.typeConvenience') || 'Магазин у дома',
    halal: t('retail.settings.typeHalal') || 'Халал маркет',
    specialty: t('retail.settings.typeSpecialty') || 'Специализированный',
  }

  const primaryPhone = useMemo(() => {
    const p =
      phones?.find((item) => item.role === 'main')?.number || phones?.[0]?.number || settings?.phone
    return p ? `+7 ${p}` : null
  }, [phones, settings?.phone])

  return (
    <div className="store-live-preview">
      {/* Header Badge */}
      <div className="store-live-preview__header">
        <div className="store-live-preview__badge">
          <span className="store-live-preview__pulse-dot" />
          <span className="store-live-preview__badge-text">
            {t('retail.desktop.livePreviewTitle') || 'Живой предпросмотр витрины'}
          </span>
        </div>
        <span className="store-live-preview__subtitle">
          {t('retail.desktop.livePreviewSub') || 'Так покупатели видят магазин в каталоге'}
        </span>
      </div>

      {/* Simulated Phone Card Container */}
      <div className="store-live-preview__phone-mockup">
        {/* Store Banner / Cover */}
        <div className="store-live-preview__cover">
          <div className="store-live-preview__cover-gradient" />
          <div className="store-live-preview__type-pill">{typeLabels[storeType] || storeType}</div>
          <div className="store-live-preview__online-pill">
            <span
              className={`store-live-preview__status-dot ${isPublished ? 'online' : 'offline'}`}
            />
            <span>{isPublished ? 'Открыто' : 'Закрыто'}</span>
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

          {/* Simulated Action Button */}
          <div className="store-live-preview__action-bar">
            <div className="store-live-preview__mock-btn">
              <SparklesIcon size={13} color="var(--retail-accent)" />
              <span>Смотреть каталог товаров</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
