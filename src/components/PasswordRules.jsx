export default function PasswordRules({ password, t }) {
  const rules = [
    { ok: password.length >= 8, text: t('auth.pwMinLength') },
    { ok: /[0-9]/.test(password), text: t('auth.pwMinDigit') },
    { ok: /[A-Za-z]/.test(password), text: t('auth.pwMinLetter') },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 2px' }}>
      {rules.map((rule, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: rule.ok ? 'var(--success-dim)' : 'var(--glass-bg)',
            }}
          >
            {rule.ok ? (
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--success-bright)"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--text-disabled)',
                }}
              />
            )}
          </div>
          <span
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-display)',
              color: rule.ok ? 'var(--success-bright)' : 'var(--text-disabled)',
            }}
          >
            {rule.text}
          </span>
        </div>
      ))}
    </div>
  )
}
