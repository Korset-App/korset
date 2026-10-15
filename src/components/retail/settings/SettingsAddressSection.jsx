import { useState } from 'react'
import { useI18n } from '../../../i18n/index.js'
import {
  LocationPinIcon,
  TwoGisIcon,
  CheckCircleIcon,
  SearchIcon,
  ChevronDownIcon,
} from '../../icons/index.js'

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

export default function SettingsAddressSection({
  address,
  twogisUrl,
  latitude,
  longitude,
  onChange,
  disabled = false,
}) {
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'

  const [showManualCoords, setShowManualCoords] = useState(false)
  const [showSeoExplanation, setShowSeoExplanation] = useState(false)

  const handle2GisUrlChange = (val) => {
    onChange('twogis_url', val)
    if (!val) return

    try {
      const decoded = decodeURIComponent(val)
      const mMatch =
        decoded.match(/[?&]m=([0-9.]+)[,/%2C]+([0-9.]+)/i) ||
        decoded.match(/\/center\/([0-9.]+)[,/%2C]+([0-9.]+)/i) ||
        decoded.match(/[?&]points=([0-9.]+)[,/%2C]+([0-9.]+)/i)
      if (mMatch) {
        const v1 = parseFloat(mMatch[1])
        const v2 = parseFloat(mMatch[2])
        let lat = null
        let lon = null
        if (v2 >= 40 && v2 <= 56 && v1 >= 46 && v1 <= 88) {
          lat = v2
          lon = v1
        } else if (v1 >= 40 && v1 <= 56 && v2 >= 46 && v2 <= 88) {
          lat = v1
          lon = v2
        }
        if (lat && lon) {
          onChange('latitude', lat)
          onChange('longitude', lon)
        }
      }
    } catch {
      // Ignore URL decode error
    }
  }

  return (
    <section id="section-address" className="bento-col-6 retail-card">
      <div className="retail-card__header">
        <div className="retail-card__icon-box">
          <LocationPinIcon size={20} />
        </div>
        <div className="retail-card__title-wrap">
          <h3 className="retail-card__title">
            {t('retail.settings.addressTitle') || (isKz ? 'Нақты мекенжай және 2GIS' : 'Фактический адрес & 2GIS')}
          </h3>
          <p className="retail-card__subtitle">
            {isKz
              ? 'Геолокация, 2GIS сілтемесі және жергілікті SEO'
              : 'Геолокация филиала, 2GIS и локальное SEO'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Фактический адрес */}
        <div>
          <div style={FIELD_LABEL_STYLE}>
            {t('retail.settings.addressLabel') || (isKz ? 'Мекенжай' : 'Фактический адрес')}
          </div>
          <input
            type="text"
            value={address}
            onChange={(e) => onChange('address', e.target.value)}
            placeholder={
              isKz
                ? 'Мысалы: Сығанақ көшесі, 14, «Лазурный квартал» ТК'
                : 'Например: ул. Сыганак, 14, ЖК Лазурный квартал'
            }
            style={INPUT_STYLE}
            disabled={disabled}
          />
        </div>

        {/* Привязка карточки в 2GIS */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: 'rgba(56, 189, 248, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--retail-accent, #38BDF8)',
                }}
              >
                <TwoGisIcon size={14} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {isKz ? '2GIS сілтемесі' : 'Ссылка на карточку в 2GIS'}
              </span>
            </div>

            {twogisUrl && (
              <a
                href={twogisUrl.startsWith('http') ? twogisUrl : `https://${twogisUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 12,
                  color: 'var(--retail-accent, #38BDF8)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>{isKz ? '2GIS-те ашу ↗' : 'Открыть в 2GIS ↗'}</span>
              </a>
            )}
          </div>

          <input
            type="text"
            value={twogisUrl || ''}
            onChange={(e) => handle2GisUrlChange(e.target.value)}
            placeholder="https://2gis.kz/astana/firm/... или go.2gis.com/..."
            style={INPUT_STYLE}
            disabled={disabled}
          />
          <div
            style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.35 }}
          >
            {isKz
              ? '2GIS-те дүкен парақшасын ашып, «Бөлісу» түймесінен сілтемені көшіріп қойыңыз. Координаттар автоматты түрде анықталады.'
              : 'Откройте филиал в 2GIS и нажмите «Поделиться». Координаты для покупателей определятся автоматически.'}
          </div>
        </div>

        {/* Координаты статус и ручная правка */}
        {latitude && longitude ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              fontSize: 12,
              color: 'var(--text)',
              padding: '9px 12px',
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <CheckCircleIcon size={15} color="#10B981" />
              <span>
                {isKz ? 'Координаттар бекітілді:' : 'Координаты зафиксированы:'}{' '}
                <b style={{ fontFamily: 'monospace' }}>
                  {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
                </b>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowManualCoords(!showManualCoords)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                fontSize: 11,
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {showManualCoords
                ? isKz
                  ? 'Жасыру'
                  : 'Скрыть'
                : isKz
                  ? 'Өзгерту'
                  : 'Изменить'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowManualCoords(!showManualCoords)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--retail-accent, #38BDF8)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {isKz ? '+ Координаттарды қолмен енгізу' : '+ Ввести координаты вручную'}
            </button>
          </div>
        )}

        {/* Manual Lat/Lon fields */}
        {showManualCoords && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              padding: '10px 12px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--retail-border)',
              borderRadius: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
                {isKz ? 'Ендік (Latitude)' : 'Широта (Latitude)'}
              </div>
              <input
                type="number"
                step="any"
                value={latitude || ''}
                onChange={(e) => onChange('latitude', e.target.value)}
                placeholder="51.1693"
                style={{ ...INPUT_STYLE, padding: '7px 10px', fontSize: 13 }}
                disabled={disabled}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
                {isKz ? 'Бойлық (Longitude)' : 'Долгота (Longitude)'}
              </div>
              <input
                type="number"
                step="any"
                value={longitude || ''}
                onChange={(e) => onChange('longitude', e.target.value)}
                placeholder="71.4490"
                style={{ ...INPUT_STYLE, padding: '7px 10px', fontSize: 13 }}
                disabled={disabled}
              />
            </div>
          </div>
        )}

        {/* Collapsible Local SEO Hint */}
        <div
          style={{
            borderRadius: 12,
            background: 'var(--glass-bg)',
            border: '1px solid var(--retail-border)',
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={() => setShowSeoExplanation(!showSeoExplanation)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              gap: 10,
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <SearchIcon size={14} color="var(--text-dim)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                {t('retail.settings.seoTitle') || (isKz ? 'Мекенжайдың жергілікті іздеуге (SEO) әсері' : 'Влияние адреса на локальный поиск (SEO)')}
              </span>
            </div>
            <ChevronDownIcon
              size={14}
              color="var(--text-dim)"
              style={{
                transform: showSeoExplanation ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
                flexShrink: 0,
              }}
            />
          </button>

          {showSeoExplanation && (
            <div
              style={{
                padding: '0 12px 12px',
                fontSize: 12,
                color: 'var(--text-sub)',
                lineHeight: 1.5,
                borderTop: '1px solid var(--retail-border)',
                paddingTop: 10,
              }}
            >
              <div style={{ marginBottom: 6, color: 'var(--text)', fontWeight: 500 }}>
                {t('retail.settings.seoBrief') ||
                  (isKz
                    ? 'Дәл координаттар дүкен сөресін Google және карталарда жақын маңдағы сатып алушылар үшін алдыңғы қатарға шығарады.'
                    : 'Точные координаты выводят витрину магазина в топ выдачи Google и на картах рядом с покупателем.')}
              </div>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5 }}
              >
                <div>
                  <strong style={{ color: 'var(--text)' }}>2GIS, Google: </strong>
                  <span>
                    {t('retail.settings.seoP1Desc') ||
                      'Поисковые алгоритмы показывают магазин в карточках выдачи для пользователей поблизости.'}
                  </span>
                </div>
                <div>
                  <strong style={{ color: 'var(--text)' }}>
                    {isKz ? 'Навигация: ' : 'Навигация: '}
                  </strong>
                  <span>
                    {t('retail.settings.seoP2Desc') ||
                      'Покупатели видят расстояние в метрах и переходят в 2GIS прямо до входа.'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
