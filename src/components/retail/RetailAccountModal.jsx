import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useI18n } from '../../i18n/index.js'
import { AVATAR_PRESETS, SILHOUETTE_PRESETS } from '../../constants/avatarPresets.js'
import ProfileAvatar from '../ProfileAvatar.jsx'
import RetailDialog from './RetailDialog.jsx'
import { AccountGlyph, LockGlyph } from './RetailGlyphs.jsx'
import { EyeIcon } from '../icons/EyeIcon.jsx'

export default function RetailAccountModal({ isOpen, onClose, returnFocusRef }) {
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const a = (key, values) => t(`retail.account.${key}`, values)
  const [name, setName] = useState(user?.user_metadata?.name || user?.email?.split('@')[0] || '')
  const [avatar, setAvatar] = useState(user?.user_metadata?.avatar_id || 'av23')
  const [tab, setTab] = useState('profile')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  useEffect(() => {
    if (!success) return undefined
    const timer = setTimeout(onClose, 1200)
    return () => clearTimeout(timer)
  }, [success, onClose])
  const save = async (event) => {
    event.preventDefault()
    setError(null)
    setSuccess(false)
    if (!user) return
    const changingPassword = tab === 'security' && Boolean(password)
    if (changingPassword && password.length < 6) {
      setError(a('passwordTooShort'))
      return
    }
    if (changingPassword && password !== confirmation) {
      setError(a('passwordMismatch'))
      return
    }
    setSaving(true)
    try {
      const payload = { data: { name: name.trim(), avatar_id: avatar } }
      if (changingPassword && password.trim()) payload.password = password.trim()
      const { error: updateError } = await supabase.auth.updateUser(payload)
      if (updateError) throw updateError
      setSuccess(true)
      setPassword('')
      setConfirmation('')
    } catch (saveError) {
      setError(saveError.message || a('saveError'))
    } finally {
      setSaving(false)
    }
  }
  if (!isOpen) return null
  return (
    <RetailDialog
      title={t('retail.shell.manageAccount')}
      subtitle={a('intro')}
      className="rc-profile-dialog"
      onClose={onClose}
      returnFocusRef={returnFocusRef}
    >
      <form onSubmit={save}>
        <div className="rc-profile-cover">
          <span className="rc-profile-cover__avatar">
            <ProfileAvatar avatarId={avatar} name={name} />
          </span>
          <div>
            <span className="rc-profile-cover__label">{a('personalProfile')}</span>
            <strong>{name || t('retail.shell.manager')}</strong>
            <small>{user?.email || a('previewNote')}</small>
          </div>
        </div>
        <div className="rc-account-form">
          <div className="rc-seg" role="group" aria-label={t('retail.shell.manageAccount')}>
            {['profile', 'security'].map((value) => (
              <button
                type="button"
                key={value}
                className="rc-seg__btn"
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
              >
                {value === 'profile' ? <AccountGlyph size={18} /> : <LockGlyph size={18} />}
                {a(value)}
              </button>
            ))}
          </div>
          {tab === 'profile' ? (
            <>
              <label>
                {a('name')}
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                />
              </label>
              <fieldset>
                <legend>{a('avatar')}</legend>
                <p className="rc-account-form__note">{a('avatarHint')}</p>
                <div className="rc-avatar-grid">
                  {[...SILHOUETTE_PRESETS, ...AVATAR_PRESETS].map((preset, i) => (
                    <button
                      type="button"
                      key={preset.id}
                      aria-label={preset.label?.[lang] || a('avatarNumber', { number: i + 1 })}
                      aria-pressed={avatar === preset.id}
                      onClick={() => setAvatar(preset.id)}
                    >
                      <ProfileAvatar avatarId={preset.id} name={name} />
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          ) : (
            <>
              <p className="rc-account-form__note">{a('securityHint')}</p>
              <label>
                {a('newPassword')}
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <label>
                {a('confirmPassword')}
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <button
                type="button"
                className="ov-text-action"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                <EyeIcon size={17} color="currentColor" />
                {a(showPassword ? 'hidePassword' : 'showPassword')}
              </button>
            </>
          )}
          {!user && <p className="rc-account-form__note">{a('previewNote')}</p>}
          {error && (
            <div className="rc-account-form__feedback" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div
              className="rc-account-form__feedback rc-account-form__feedback--success"
              role="status"
            >
              {a('saved')}
            </div>
          )}
        </div>
        <footer className="rc-dialog__foot">
          <button type="button" className="rc-btn" onClick={onClose}>
            {t('retail.shell.close')}
          </button>
          <button type="submit" className="rc-btn rc-btn--primary" disabled={saving || !user}>
            {a(saving ? 'saving' : 'save')}
          </button>
        </footer>
      </form>
    </RetailDialog>
  )
}
