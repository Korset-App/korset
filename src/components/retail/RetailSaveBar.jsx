import { useI18n } from '../../i18n/index.js'
import { CheckCircleIcon, AlertTriangleIcon } from '../icons/index.js'

export default function RetailSaveBar({
  isDirty,
  isSaving,
  saveStatus,
  saveErrorMessage,
  onSave,
  onDiscard,
}) {
  const { t } = useI18n()

  if (!isDirty && !isSaving && saveStatus !== 'ok' && saveStatus !== 'error') {
    return null
  }

  return (
    <div className="retail-save-bar" role="region" aria-label="Панель сохранения настроек">
      <div className="retail-save-bar__content">
        {/* Left: Status text & indicator */}
        <div className="retail-save-bar__status">
          {saveStatus === 'ok' ? (
            <>
              <CheckCircleIcon size={18} color="var(--success-bright, #10b981)" />
              <span className="retail-save-bar__text retail-save-bar__text--success">
                {t('retail.desktop.savedSuccess') || 'Настройки сохранены!'}
              </span>
            </>
          ) : saveStatus === 'error' ? (
            <>
              <AlertTriangleIcon size={18} color="var(--error-bright, #ef4444)" />
              <span className="retail-save-bar__text retail-save-bar__text--error">
                {saveErrorMessage || 'Ошибка при сохранении'}
              </span>
            </>
          ) : (
            <>
              <span className="retail-save-bar__pulse-dot" />
              <span className="retail-save-bar__text">
                {t('retail.desktop.unsavedChanges') || 'Есть несохранённые изменения'}
              </span>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="retail-save-bar__actions">
          {onDiscard && !isSaving && (
            <button
              type="button"
              className="retail-save-bar__btn-discard"
              onClick={onDiscard}
              disabled={isSaving}
            >
              {t('retail.desktop.discardChanges') || 'Сбросить'}
            </button>
          )}

          <button
            type="button"
            className="retail-save-bar__btn-save"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="retail-save-bar__spinner" aria-hidden="true" />
                <span>{t('retail.desktop.saving') || 'Сохранение...'}</span>
              </>
            ) : saveStatus === 'ok' ? (
              <>
                <CheckCircleIcon size={16} />
                <span>{t('retail.products.saved') || 'Сохранено'}</span>
              </>
            ) : (
              <span>{t('retail.desktop.saveChanges') || 'Сохранить изменения'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
