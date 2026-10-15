import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useI18n, setLang } from '../../i18n/index.js'
import { useTheme } from '../../utils/theme.js'
import ProfileAvatar from '../ProfileAvatar.jsx'
import { ChevronDownIcon } from '../icons/ChevronDownIcon.jsx'
import { InstallIcon } from '../icons/InstallIcon.jsx'
import { AccountGlyph, LogoutGlyph, TelegramGlyph } from './RetailGlyphs.jsx'
import SegmentedToggle from '../SegmentedToggle.jsx'
import { SunGlyph, MoonGlyph } from '../ThemeGlyphs.jsx'
import RetailDialog from './RetailDialog.jsx'

const AccountDialog = lazy(() => import('./RetailAccountModal.jsx'))

function menuAnchor(rect, mobile) {
  const width = Math.min(320, window.innerWidth - 24)
  const left = Math.min(
    Math.max(12, mobile ? rect.right - width : rect.left),
    window.innerWidth - width - 12
  )
  return mobile
    ? { left, top: rect.bottom + 12, width, maxHeight: window.innerHeight - rect.bottom - 24 }
    : { left, bottom: window.innerHeight - rect.top + 12, width, maxHeight: rect.top - 24 }
}

export default function RetailAccountMenu({ compact = false, mobile = false }) {
  const { user, signOut } = useAuth()
  const { t, lang } = useI18n()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const triggerRef = useRef(null)
  const [anchorStyle, setAnchorStyle] = useState(null)
  const name = user?.user_metadata?.name || user?.email?.split('@')[0] || t('retail.shell.manager')

  useEffect(() => {
    const onInstall = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const onInstalled = () => setInstallPrompt(null)
    window.addEventListener('beforeinstallprompt', onInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const toggleMenu = () => {
    setAnchorStyle(menuAnchor(triggerRef.current.getBoundingClientRect(), mobile))
    setOpen((value) => !value)
  }

  useEffect(() => {
    if (!open) return undefined
    let frame
    const reposition = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        if (triggerRef.current)
          setAnchorStyle(menuAnchor(triggerRef.current.getBoundingClientRect(), mobile))
      })
    }
    window.addEventListener('resize', reposition)
    window.visualViewport?.addEventListener('resize', reposition)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', reposition)
      window.visualViewport?.removeEventListener('resize', reposition)
    }
  }, [open, mobile])

  const install = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    if ((await installPrompt.userChoice).outcome === 'accepted') setInstallPrompt(null)
  }

  return (
    <div
      className={`rc-account ${mobile ? 'rc-account--mobile' : ''} ${compact ? 'rc-account--compact' : ''}`}
    >
      <button
        type="button"
        className="rc-account__trigger"
        aria-label={t('retail.shell.account')}
        aria-expanded={open}
        ref={triggerRef}
        onClick={toggleMenu}
      >
        <span className="rc-account__avatar">
          <ProfileAvatar avatarId={user?.user_metadata?.avatar_id || 'av23'} name={name} />
        </span>
        <span
          className={`rc-account__copy ${compact ? 'rc-account__copy--hidden' : ''}`}
          aria-hidden={compact}
        >
          <strong>{name}</strong>
          <small>{t('retail.shell.manager')}</small>
        </span>
        <ChevronDownIcon
          size={15}
          className={`rc-account__chevron ${compact ? 'rc-account__copy--hidden' : ''}`}
        />
      </button>
      {open && (
        <RetailDialog
          title={t('retail.shell.account')}
          hideHeader
          anchorStyle={anchorStyle}
          className="rc-account__panel"
          returnFocusRef={triggerRef}
          onClose={() => setOpen(false)}
        >
          <div className="rc-menu__head rc-menu__identity">
            <span className="rc-menu__identity-avatar">
              <ProfileAvatar avatarId={user?.user_metadata?.avatar_id || 'av23'} name={name} />
            </span>
            <div>
              <strong>{name}</strong>
              <small>{user?.email || t('retail.shell.manager')}</small>
            </div>
          </div>
          <button
            type="button"
            className="rc-menu__item"
            onClick={() => {
              setOpen(false)
              setAccountOpen(true)
            }}
          >
            <AccountGlyph size={20} />
            {t('retail.shell.manageAccount')}
          </button>
          <div className="rc-menu__preferences">
            <div>
              <span>{t('retail.shell.theme')}</span>
              <div className="rc-preference-toggle">
                <SegmentedToggle
                  activeKey={theme}
                  onChange={setTheme}
                  ariaLabel={t('retail.shell.theme')}
                  options={[
                    {
                      key: 'light',
                      ariaLabel: t('retail.shell.light'),
                      render: (active) => <SunGlyph filled={active} />,
                    },
                    {
                      key: 'dark',
                      ariaLabel: t('retail.shell.dark'),
                      render: (active) => <MoonGlyph filled={active} />,
                    },
                  ]}
                />
              </div>
            </div>
            <div>
              <span>{t('retail.shell.language')}</span>
              <div className="rc-preference-toggle">
                <SegmentedToggle
                  activeKey={lang}
                  onChange={setLang}
                  ariaLabel={t('retail.shell.language')}
                  options={['ru', 'kz'].map((value) => ({
                    key: value,
                    label: value.toUpperCase(),
                  }))}
                />
              </div>
            </div>
          </div>
          {installPrompt && (
            <button type="button" className="rc-menu__item" onClick={install}>
              <InstallIcon size={17} />
              {t('retail.desktop.installApp')}
            </button>
          )}
          <a
            className="rc-menu__item"
            href="https://t.me/korset_support_bot"
            target="_blank"
            rel="noopener noreferrer"
          >
            <TelegramGlyph size={20} />
            {t('retail.shell.support')}
          </a>
          <button
            type="button"
            className="rc-menu__item rc-menu__item--danger"
            onClick={async () => {
              await signOut()
              setOpen(false)
            }}
          >
            <LogoutGlyph size={20} />
            {t('retail.shell.signOut')}
          </button>
        </RetailDialog>
      )}
      {accountOpen && (
        <Suspense
          fallback={
            <div className="rc-dialog-backdrop" role="status">
              {t('retail.shell.loading')}
            </div>
          }
        >
          <AccountDialog isOpen onClose={() => setAccountOpen(false)} returnFocusRef={triggerRef} />
        </Suspense>
      )}
    </div>
  )
}
