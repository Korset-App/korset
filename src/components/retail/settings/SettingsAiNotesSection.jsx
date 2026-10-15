import { useI18n } from '../../../i18n/index.js'
import { SparklesIcon } from '../../icons/index.js'
import { getAIStoreNotesLimit } from '../../../domain/retail/storeSettings.js'

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

export default function SettingsAiNotesSection({
  aiStoreNotes,
  onChange,
  disabled = false,
}) {
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'

  const aiNotesLimit = getAIStoreNotesLimit()
  const aiNotesText = aiStoreNotes || ''
  const aiNotesWords = aiNotesText.trim() ? aiNotesText.trim().split(/\s+/).length : 0
  const aiNotesChars = aiNotesText.length

  return (
    <section id="section-ai" className="bento-col-12 retail-card">
      <div className="retail-card__header">
        <div className="retail-card__icon-box">
          <SparklesIcon size={20} />
        </div>
        <div className="retail-card__title-wrap">
          <h3 className="retail-card__title">
            {t('retail.settings.aiNotesTitle') || (isKz ? 'Körset AI үшін ескертпелер' : 'Заметки для Körset AI')}
          </h3>
          <p className="retail-card__subtitle">
            {isKz
              ? 'Сөре жанындағы ақылды кеңесші білуі тиіс маңызды деректер (тек AI көреді)'
              : 'Факты о магазине, которые умный ассистент использует при ответах покупателям'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={FIELD_LABEL_STYLE}>
            {t('retail.settings.aiNotesLabel') || (isKz ? 'Сөре жанындағы кеңесшіге арналған деректер' : 'Факты для ассистента у полки')}
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-dim)',
                marginLeft: 6,
                fontWeight: 400,
              }}
            >
              {t('retail.settings.aiNotesHint') || (isKz ? '(Тек AI көреді)' : '(Видит только AI)')}
            </span>
          </div>
          <textarea
            value={aiNotesText}
            onChange={(e) => onChange('ai_store_notes', e.target.value)}
            placeholder={
              t('retail.settings.aiNotesPlaceholder') ||
              (isKz
                ? 'Мысалы: сағат 18:00-ден кейін есікке дейін жеткізу, 08:30-да жаңа піскен нан, сейсенбі күндері фермерлік сүт өнімдері...'
                : 'Например: доставка до двери после 18:00, свежая выпечка в 08:30, фермерская молочка по вторникам...')
            }
            maxLength={aiNotesLimit}
            rows={4}
            style={{
              ...INPUT_STYLE,
              resize: 'vertical',
              minHeight: 90,
              lineHeight: 1.4,
            }}
            disabled={disabled}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 11,
              color: 'var(--text-dim)',
              marginTop: 6,
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            <span>
              {t('retail.settings.aiNotesWarning') ||
                (isKz ? 'Дүкен туралы тек тексерілетін нақты фактілерді жазыңыз' : 'Пишите только проверяемые факты о магазине')}
            </span>
            <span style={{ fontWeight: 600 }}>
              {aiNotesWords} {t('retail.settings.words') || (isKz ? 'сөз' : 'слов')} · {aiNotesChars}/
              {aiNotesLimit} {t('retail.settings.chars') || (isKz ? 'таңба' : 'симв.')}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
