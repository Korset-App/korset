import { useState, useEffect } from 'react'
import { useI18n } from '../../i18n/index.js'
import {
  StorefrontIcon,
  LocationPinIcon,
  PhoneCallIcon,
  ClockIcon,
  AdvantagesIcon,
  SparklesIcon,
  AlertTriangleIcon,
  LockIcon,
  TrashIcon,
} from '../icons/index.js'

export const SETTINGS_SECTIONS = [
  {
    id: 'section-basic',
    labelKey: 'retail.settings.infoTitle',
    fallback: 'Основная информация',
    icon: StorefrontIcon,
  },
  {
    id: 'section-contacts',
    labelKey: 'retail.settings.contactsTitle',
    fallback: 'Контакты и связь',
    icon: PhoneCallIcon,
  },
  {
    id: 'section-address',
    labelKey: 'retail.settings.addressTitle',
    fallback: 'Фактический адрес & 2GIS',
    icon: LocationPinIcon,
  },
  {
    id: 'section-schedule',
    labelKey: 'retail.settings.scheduleTitle',
    fallback: 'График и статус работы',
    icon: ClockIcon,
  },
  {
    id: 'section-amenities',
    labelKey: 'retail.settings.amenitiesTitle',
    fallback: 'Сервис и удобства',
    icon: AdvantagesIcon,
  },
  {
    id: 'section-ai',
    labelKey: 'retail.settings.aiNotesTitle',
    fallback: 'Заметки для Körset AI',
    icon: SparklesIcon,
  },
  {
    id: 'section-notifications',
    labelKey: 'retail.settings.notificationsTitle',
    fallback: 'Уведомления',
    icon: AlertTriangleIcon,
  },
  {
    id: 'section-team',
    labelKey: 'retail.settings.teamTitle',
    fallback: 'Команда и доступы',
    icon: LockIcon,
  },
  {
    id: 'section-danger',
    labelKey: 'retail.settings.dangerTitle',
    fallback: 'Публикация и сброс',
    icon: TrashIcon,
    danger: true,
  },
]

export default function RetailSettingsAnchorNav() {
  const { t } = useI18n()
  const [activeId, setActiveId] = useState('section-basic')

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 140
      for (let i = SETTINGS_SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SETTINGS_SECTIONS[i].id)
        if (el && el.offsetTop <= scrollPos) {
          setActiveId(SETTINGS_SECTIONS[i].id)
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id) => {
    const target = document.getElementById(id)
    if (target) {
      const targetY = target.getBoundingClientRect().top + window.pageYOffset - 90
      window.scrollTo({ top: targetY, behavior: 'smooth' })
      setActiveId(id)
    }
  }

  return (
    <nav className="retail-anchor-nav" aria-label="Оглавление настроек">
      <div className="retail-anchor-nav__header">
        <span className="retail-anchor-nav__title">
          {t('retail.desktop.tocTitle') || 'Разделы настроек'}
        </span>
      </div>

      <div className="retail-anchor-nav__list">
        {SETTINGS_SECTIONS.map((sec) => {
          const isActive = activeId === sec.id
          const Icon = sec.icon
          const raw = t(sec.labelKey)
          const label = raw && raw !== sec.labelKey ? raw : sec.fallback

          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => scrollToSection(sec.id)}
              className={`retail-anchor-nav__item ${
                isActive ? 'retail-anchor-nav__item--active' : ''
              } ${sec.danger ? 'retail-anchor-nav__item--danger' : ''}`}
            >
              <span className="retail-anchor-nav__icon">
                <Icon size={16} />
              </span>
              <span className="retail-anchor-nav__label">{label}</span>
              {isActive && <span className="retail-anchor-nav__indicator" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
