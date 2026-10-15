import { Link } from 'react-router-dom'
import { useI18n } from '../../../i18n/index.js'
import { StorefrontIcon, ChevronDownIcon, ExternalLinkIcon } from '../../icons/index.js'
import { STORE_TYPES } from '../../../domain/retail/storeSettings.js'

const FIELD_LABEL_STYLE = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: 'var(--text-dim)',
  marginBottom: 8,
}

const INPUT_STYLE = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 12,
  border: '1px solid var(--retail-border)',
  background: 'var(--glass-bg)',
  color: 'var(--text)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-body)',
  transition: 'border-color 0.15s ease',
}

export default function SettingsBasicSection({
  name,
  type,
  targetSlug,
  onChange,
  disabled = false,
}) {
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'

  return (
    <section id="section-basic" className="bento-col-12 retail-card">
      <div className="retail-card__header">
        <div className="retail-card__icon-box">
          <StorefrontIcon size={20} />
        </div>
        <div className="retail-card__title-wrap">
          <h3 className="retail-card__title">
            {t('retail.settings.infoTitle') || (isKz ? 'Негізгі ақпарат' : 'Основная информация')}
          </h3>
          <p className="retail-card__subtitle">
            {isKz
              ? 'Филиалдың негізгі параметрлері және сауда пішімі'
              : 'Базовые параметры торговой точки и формат магазина'}
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: 18,
          marginBottom: 18,
        }}
      >
        {/* Название магазина */}
        <div>
          <div style={FIELD_LABEL_STYLE}>
            {t('retail.settings.nameLabel') || (isKz ? 'Дүкен атауы' : 'Название магазина')}
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => onChange('name', e.target.value)}
            style={INPUT_STYLE}
            placeholder={isKz ? 'Мысалы: Bereke Market' : 'Например: Bereke Market'}
            maxLength={80}
            disabled={disabled}
          />
        </div>

        {/* Формат магазина (SSOT) */}
        <div>
          <div style={FIELD_LABEL_STYLE}>
            {t('retail.settings.storeTypeLabel') || (isKz ? 'Дүкен түрі' : 'Тип магазина')}
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={type || 'minimarket'}
              onChange={(e) => onChange('type', e.target.value)}
              disabled={disabled}
              style={{
                ...INPUT_STYLE,
                appearance: 'none',
                WebkitAppearance: 'none',
                paddingRight: 36,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {STORE_TYPES.map((st) => (
                <option key={st.id} value={st.id}>
                  {t(st.labelKey) || (isKz ? st.fallbackKz : st.fallbackRu)}
                </option>
              ))}
            </select>
            <div
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: 'var(--text-dim)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ChevronDownIcon size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Banner: Storefront link notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          padding: '14px 18px',
          borderRadius: 14,
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.22)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 240, flex: 1 }}>
          <StorefrontIcon size={20} color="var(--retail-accent, #38bdf8)" />
          <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
            {t('retail.settings.storefrontLinkNotice') ||
              (isKz
                ? 'Витринаны безендіру, логотип, мұқаба және кассалық QR басып шығару бөлек бөлімге ауыстырылды'
                : 'Оформление витрины, логотип, обложка и печать QR-кодов для кассы перенесены в раздел')}{' '}
            <strong style={{ color: 'var(--retail-accent, #38bdf8)' }}>
              {t('retail.nav.storefront') || (isKz ? 'Витрина' : 'Витрина')}
            </strong>
            .
          </span>
        </div>

        {targetSlug && (
          <Link
            to={`/retail/${targetSlug}/storefront`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              background: 'var(--retail-accent, #38bdf8)',
              color: '#080c18',
              fontWeight: 700,
              fontSize: 12.5,
              textDecoration: 'none',
              transition: 'opacity 0.15s ease',
            }}
          >
            <span>{t('retail.settings.goToStorefront') || (isKz ? 'Витринаға өту' : 'Перейти в Витрину')}</span>
            <ExternalLinkIcon size={14} />
          </Link>
        )}
      </div>
    </section>
  )
}
