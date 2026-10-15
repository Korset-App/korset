import { useI18n } from '../../../i18n/index.js'
import { AlertTriangleIcon } from '../../icons/index.js'
import Toggle from '../../Toggle.jsx'

export default function SettingsNotificationsSection({
  notifyMissing,
  notifyDaily,
  savingToggle,
  onToggle,
}) {
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'

  return (
    <section id="section-notifications" className="bento-col-12 retail-card">
      <div className="retail-card__header">
        <div className="retail-card__icon-box">
          <AlertTriangleIcon size={20} />
        </div>
        <div className="retail-card__title-wrap">
          <h3 className="retail-card__title">
            {t('retail.settings.notifyTitle') || (isKz ? 'Хабарландырулар' : 'Уведомления')}
          </h3>
          <p className="retail-card__subtitle">
            {isKz
              ? 'Тауарлардың бітуі және күнделікті қорытынды туралы ескертулер'
              : 'Оповещения об отсутствующих товарах и вечерний отчет'}
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--glass-bg)',
          border: '1px solid var(--retail-border)',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        {/* Toggle 1: Отсутствующие товары */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            padding: '14px 18px',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, marginBottom: 2 }}
            >
              {t('retail.settings.notifyMissingTitle') || (isKz ? 'Сөреде тауардың болмауы' : 'Отсутствующие товары')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>
              {t('retail.settings.notifyMissingHint') ||
                (isKz ? 'Сатып алушы тауарды таппаған жағдайда хабарландыру' : 'Пуш-уведомление, если покупатель не нашел товар')}
            </div>
          </div>
          <Toggle
            checked={notifyMissing}
            onChange={() => onToggle('notifyMissing', 'notify_oos_enabled')}
            disabled={savingToggle === 'notifyMissing'}
          />
        </div>

        <div style={{ height: 1, background: 'var(--retail-border)', margin: '0 18px' }} />

        {/* Toggle 2: Ежедневный отчет */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            padding: '14px 18px',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, marginBottom: 2 }}
            >
              {t('retail.settings.notifyDailyTitle') || (isKz ? 'Күнделікті есеп' : 'Ежедневный отчет')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>
              {t('retail.settings.notifyDailyHint') || (isKz ? 'Әр кеште сканерлеудің қысқаша қорытындысы' : 'Сводка сканирований каждый вечер')}
            </div>
          </div>
          <Toggle
            checked={notifyDaily}
            onChange={() => onToggle('notifyDaily', 'notify_daily_enabled')}
            disabled={savingToggle === 'notifyDaily'}
          />
        </div>
      </div>
    </section>
  )
}
