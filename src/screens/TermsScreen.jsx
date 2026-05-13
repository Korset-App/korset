import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/index.js'
import { markdownToHtml } from '../legal/markdown.js'
import ruMd from '../legal/terms-ru.md?raw'
import kzMd from '../legal/terms-kz.md?raw'

const TERMS = { ru: ruMd, kz: kzMd }

export default function TermsScreen() {
  const navigate = useNavigate()
  const { lang, t } = useI18n()

  const date = new Date().toLocaleDateString(lang === 'kz' ? 'kk-KZ' : 'ru-RU')
  const md = (TERMS[lang] || TERMS.ru).replace('{date}', date)
  const html = markdownToHtml(md)

  return (
    <div
      className="screen"
      style={{
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px 16px' }}>
        <button
          onClick={() => navigate(-1)}
          aria-label={t('common.back')}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            border: '1px solid var(--glass-border)',
            background: 'var(--glass-bg)',
            color: 'var(--text)',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            letterSpacing: 0.5,
            color: 'var(--text)',
            lineHeight: 1.2,
          }}
        >
          {t('profile.terms')}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 22px 40px' }}>
        <div
          className="glass-card"
          style={{ padding: '24px 20px', textAlign: 'left' }}
          lang={lang === 'kz' ? 'kk' : 'ru'}
          dangerouslySetInnerHTML={{
            __html: html
              .replace(
                /<h3>/g,
                '<h3 style="color:var(--text);margin:18px 0 6px;font-size:14px;font-weight:700">'
              )
              .replace(
                /<p>/g,
                '<p style="color:var(--text-sub);font-size:13px;line-height:1.65;margin:6px 0;text-align:justify;text-justify:inter-word;hyphens:auto">'
              )
              .replace(
                /<ul>/g,
                '<ul style="padding-left:20px;margin:6px 0;color:var(--text-sub);font-size:13px;line-height:1.65">'
              )
              .replace(/<li>/g, '<li style="margin-bottom:4px">'),
          }}
        />
      </div>
    </div>
  )
}
