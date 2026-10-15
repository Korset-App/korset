import { useI18n } from '../../../i18n/index.js'
import { TrashIcon } from '../../icons/index.js'
import Toggle from '../../Toggle.jsx'

export default function SettingsDangerSection({
  isPublished,
  savingToggle,
  isClearing,
  onTogglePublished,
  onOpenClearModal,
}) {
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'

  return (
    <section id="section-danger" className="bento-col-12 retail-card retail-card--danger">
      <div className="retail-card__header">
        <div
          className="retail-card__icon-box"
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            borderColor: 'rgba(239, 68, 68, 0.25)',
            color: 'var(--error-bright, #ef4444)',
          }}
        >
          <TrashIcon size={20} />
        </div>
        <div className="retail-card__title-wrap">
          <h3
            className="retail-card__title"
            style={{ color: 'var(--error-bright, #ef4444)' }}
          >
            {t('retail.settings.dangerTitle') || (isKz ? 'Қауіпті аймақ' : 'Публикация и сброс')}
          </h3>
          <p className="retail-card__subtitle">
            {isKz
              ? 'Дүкеннің жалпыға көріну күйі және каталогты тазарту'
              : 'Видимость магазина для покупателей и очистка каталога'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Publication Status Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 18px',
            borderRadius: 14,
            background: 'var(--glass-bg)',
            border: '1px solid var(--retail-border)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>
                {t('retail.settings.publishStatusTitle') || (isKz ? 'Дүкенді жариялау' : 'Публикация магазина')}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: isPublished
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(239, 68, 68, 0.12)',
                  color: isPublished
                    ? 'var(--success-bright, #10b981)'
                    : 'var(--error-bright, #ef4444)',
                  border: `1px solid ${
                    isPublished
                      ? 'rgba(16, 185, 129, 0.25)'
                      : 'rgba(239, 68, 68, 0.25)'
                  }`,
                }}
              >
                {isPublished
                  ? t('retail.settings.published') || (isKz ? 'Жарияланды' : 'Опубликован')
                  : t('retail.settings.draft') || (isKz ? 'Черновик' : 'Черновик')}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-sub)', lineHeight: 1.35 }}>
              {isPublished
                ? t('retail.settings.publishedHint') ||
                  (isKz
                    ? 'Каталог сатып алушыларға көрінеді, сілтеме бойынша қолжетімді және іздеу жүйелерінде индекстеледі.'
                    : 'Каталог виден покупателям, доступен по ссылке и индексируется поисковиками.')
                : t('retail.settings.draftHint') ||
                  (isKz
                    ? 'Дүкен сатып алушылардан жасырылған. Тек сізге және әкімшілікке қолжетімді.'
                    : 'Магазин скрыт от покупателей. Доступен только вам и супер-администрации.')}
            </div>
          </div>

          <Toggle
            checked={isPublished}
            onChange={onTogglePublished}
            disabled={savingToggle === 'is_published'}
          />
        </div>

        {/* Clear Catalog */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 18px',
            borderRadius: 14,
            background: 'var(--glass-bg)',
            border: '1px solid var(--retail-border)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                color: 'var(--error-bright, #ef4444)',
                fontWeight: 600,
                marginBottom: 2,
              }}
            >
              {t('retail.settings.clearCatalog') || (isKz ? 'Каталогты тазарту' : 'Очистить каталог')}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.35 }}>
              {t('retail.settings.clearCatalogDesc') ||
                (isKz
                  ? 'Дүкен каталогынан қосылған барлық тауарларды біржола өшіру'
                  : 'Удалить все добавленные товары из каталога магазина')}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenClearModal}
            disabled={isClearing}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--error-bright, #ef4444)',
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: isClearing ? 'wait' : 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            {t('retail.settings.clearBtn') || (isKz ? 'Тазарту' : 'Сброс')}
          </button>
        </div>
      </div>
    </section>
  )
}
