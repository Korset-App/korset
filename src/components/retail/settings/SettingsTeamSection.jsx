import { useI18n } from '../../../i18n/index.js'
import ProfileAvatar from '../../ProfileAvatar.jsx'
import { LockIcon } from '../../icons/index.js'

export default function SettingsTeamSection({ user }) {
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'

  return (
    <section id="section-team" className="bento-col-12 retail-card">
      <div className="retail-card__header">
        <div className="retail-card__icon-box">
          <LockIcon size={20} />
        </div>
        <div className="retail-card__title-wrap">
          <h3 className="retail-card__title">
            {t('retail.settings.teamTitle') || (isKz ? 'Команда және рұқсаттар' : 'Команда и доступы')}
          </h3>
          <p className="retail-card__subtitle">
            {t('retail.settings.teamSub') || (isKz ? 'Дүкен қызметкерлерінің құқықтарын басқару' : 'Управление правами сотрудников магазина')}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Current Owner Profile Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderRadius: 14,
            background: 'var(--glass-bg)',
            border: '1px solid var(--retail-border)',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 200 }}>
            <div style={{ width: 42, height: 42 }}>
              <ProfileAvatar size={42} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                {user?.email || 'owner@korset.kz'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                {t('retail.settings.teamRoleOwner') || (isKz ? 'Басқарушы (Толық рұқсат)' : 'Управляющий (Полный доступ)')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.4px',
                padding: '3px 9px',
                borderRadius: 6,
                background: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--success-bright, #10b981)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              {t('retail.settings.teamStatusActive') || (isKz ? 'Белсенді' : 'Активен')}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 6,
                background: 'rgba(56, 189, 248, 0.12)',
                color: 'var(--retail-accent, #38bdf8)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
              }}
            >
              {t('retail.settings.teamCurrentOwner') || (isKz ? 'Иесі' : 'Владелец')}
            </span>
          </div>
        </div>

        {/* Roles Roadmap Teaser */}
        <div
          style={{
            padding: '16px 18px',
            borderRadius: 14,
            background: 'rgba(56, 189, 248, 0.05)',
            border: '1px dashed rgba(56, 189, 248, 0.28)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
              color: 'var(--retail-accent, #38bdf8)',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <LockIcon size={16} />
            <span>
              {t('retail.settings.teamRolesTeaserTitle') || (isKz ? 'Қызметкерлердің бөлек рөлдері' : 'Раздельные роли сотрудников')}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.5 }}>
            {t('retail.settings.teamRolesTeaserBody') ||
              (isKz
                ? 'Келесі жаңартуда шектеулі құқықтары бар қызметкерлерді қосу мүмкіндігі пайда болады: «Кассир» (тек сканерлеу және кассалық чек), «Тауартанушы» (қабылдау, қалдықтар мен бағалар), «Бухгалтер» (есептер мен жүкқұжаттар).'
                : 'В следующем обновлении появится добавление сотрудников с ограниченными правами: «Кассир» (только сканирование и кассовый чек), «Товаровед» (приемка, остатки и цены), «Бухгалтер» (отчеты и накладные).')}
          </p>
        </div>
      </div>
    </section>
  )
}
