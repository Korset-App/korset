import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../../i18n/index.js'
import { ALLERGENS, getAllergenShortName } from '../../constants/allergens.js'
import { DIET_PREFERENCES } from '../../constants/dietGoals.js'
import { CloseIcon, DietIcon } from '../../components/icons/index.js'
import { FitCheckIcon } from '../icons/FitCheckIcon.jsx'
import { getFitProfileStatus } from '../../utils/fitProfileStatus.js'
import './FitCheckDrawer.css'

function toggleIn(list, id) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
}

function Chip({ active, icon, label, onClick, variant = 'diet' }) {
  return (
    <button
      type="button"
      className={`fit-sheet__chip fit-sheet__chip--${variant}${active ? ' is-active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <DietIcon name={icon} size={16} />
      <span>{label}</span>
    </button>
  )
}

function PresetOption({ active, label, subtitle, onClick, variant = 'diet' }) {
  return (
    <button
      type="button"
      className={`fit-sheet__preset fit-sheet__preset--${variant}${active ? ' is-active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <div className="fit-sheet__preset-icon-box" aria-hidden="true">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div className="fit-sheet__preset-texts">
        <span className="fit-sheet__preset-title">{label}</span>
        {subtitle ? <span className="fit-sheet__preset-sub">{subtitle}</span> : null}
      </div>
      <div className="fit-sheet__preset-indicator" aria-hidden="true">
        <span className="fit-sheet__preset-indicator-dot" />
      </div>
    </button>
  )
}

export default function FitCheckDrawer({
  open,
  initialSection = null,
  onClose,
  profile = {},
  updateProfile,
  onOpenFullPreferences,
}) {
  const { lang, t } = useI18n()
  const [prevOpen, setPrevOpen] = useState(false)
  const [halal, setHalal] = useState(false)
  const [diets, setDiets] = useState([])
  const [allergens, setAllergens] = useState([])
  const [noDiet, setNoDiet] = useState(false)
  const [noAllergies, setNoAllergies] = useState(false)
  const [saving, setSaving] = useState(false)

  const dietSectionRef = useRef(null)
  const allergensSectionRef = useRef(null)

  const customCount = (profile.customAllergens || []).length

  // Synchronize draft state when opening drawer without cascading effect setState warning
  if (open && !prevOpen) {
    setPrevOpen(true)
    const status = getFitProfileStatus(profile)
    setHalal(status.halal)
    setDiets(status.diets)
    setAllergens(status.allergens)
    setNoDiet(status.noDiet)
    setNoAllergies(status.noAllergies)
  } else if (!open && prevOpen) {
    setPrevOpen(false)
  }

  useEffect(() => {
    if (open) {
      document.documentElement.classList.add('fitcheck-drawer-open')
      document.body.classList.add('fitcheck-drawer-open')
      if (initialSection) {
        const timer = setTimeout(() => {
          const target =
            initialSection === 'allergens' ? allergensSectionRef.current : dietSectionRef.current
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }
        }, 100)
        return () => clearTimeout(timer)
      }
    } else {
      document.documentElement.classList.remove('fitcheck-drawer-open')
      document.body.classList.remove('fitcheck-drawer-open')
    }
    return () => {
      document.documentElement.classList.remove('fitcheck-drawer-open')
      document.body.classList.remove('fitcheck-drawer-open')
    }
  }, [open, initialSection])

  function pickHalal() {
    setNoDiet(false)
    setHalal((prev) => !prev)
  }

  function pickDiet(id) {
    setNoDiet(false)
    setDiets((prev) => toggleIn(prev, id))
  }

  function pickAllergen(id) {
    setNoAllergies(false)
    setAllergens((prev) => toggleIn(prev, id))
  }

  function pickNoDiet() {
    setNoDiet((prev) => !prev)
    setHalal(false)
    setDiets([])
  }

  function pickNoAllergies() {
    setNoAllergies((prev) => !prev)
    setAllergens([])
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({
        halal,
        halalOnly: halal,
        dietGoals: diets,
        allergens,
        noDietPreferences: noDiet,
        noAllergies: noAllergies && customCount === 0,
      })
      onClose()
    } catch (err) {
      console.error('Failed to save Fit-Check preferences', err)
    } finally {
      setSaving(false)
    }
  }

  const otherDiets = DIET_PREFERENCES.filter((d) => d.id !== 'halal')
  const activeCount = (halal ? 1 : 0) + diets.length + allergens.length
  const canSave = activeCount > 0 || noDiet || noAllergies || customCount > 0

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fitcheck-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            onTouchMove={(e) => e.preventDefault()}
            role="button"
            tabIndex={-1}
            aria-label={t('common.close')}
          />
          <motion.div
            className="fitcheck-drawer"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 350, mass: 0.8 }}
            style={{ willChange: 'transform' }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 90 || velocity.y > 400) {
                onClose()
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-label={t('home.fitCard.title')}
          >
            <div className="fitcheck-drawer__handle-wrap">
              <div className="fitcheck-drawer__handle" />
            </div>

            <div className="fitcheck-drawer__header">
              <div className="fitcheck-drawer__title-wrap">
                <div className="fitcheck-drawer__icon">
                  <FitCheckIcon size={24} active={activeCount > 0} />
                </div>
                <div className="fitcheck-drawer__titles">
                  <h3 className="fitcheck-drawer__title">{t('home.fitCard.title')}</h3>
                  <p className="fitcheck-drawer__subtitle">{t('home.fitCard.sheetSub')}</p>
                </div>
              </div>
              <button
                type="button"
                className="fitcheck-drawer__close"
                onClick={onClose}
                aria-label={t('common.close')}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="fitcheck-drawer__body">
              <section ref={dietSectionRef} className="fit-sheet__section">
                <div className="fit-sheet__section-head">
                  <span className="fit-sheet__badge fit-sheet__badge--diet">
                    <span className="fit-sheet__badge-dot fit-sheet__badge-dot--diet" />
                    <h4 className="fit-sheet__section-title fit-sheet__section-title--diet">
                      {t('home.fitCard.stepDiet')}
                    </h4>
                  </span>
                </div>

                <PresetOption
                  active={noDiet}
                  label={t('home.fitCard.noRestrictions')}
                  subtitle={t('home.fitCard.noRestrictionsSub')}
                  onClick={pickNoDiet}
                  variant="diet"
                />

                <div className="fit-sheet__chips">
                  <Chip
                    active={halal}
                    icon="halal"
                    label={t('home.preferenceHalal')}
                    onClick={pickHalal}
                    variant="diet"
                  />
                  {otherDiets.map((diet) => (
                    <Chip
                      key={diet.id}
                      active={diets.includes(diet.id)}
                      icon={diet.icon}
                      label={diet.label?.[lang] || diet.label?.ru || diet.id}
                      onClick={() => pickDiet(diet.id)}
                      variant="diet"
                    />
                  ))}
                </div>
              </section>

              <section ref={allergensSectionRef} className="fit-sheet__section">
                <div className="fit-sheet__section-head">
                  <span className="fit-sheet__badge fit-sheet__badge--allergen">
                    <span className="fit-sheet__badge-dot fit-sheet__badge-dot--allergen" />
                    <h4 className="fit-sheet__section-title fit-sheet__section-title--allergen">
                      {t('home.fitCard.stepAllergens')}
                    </h4>
                  </span>
                </div>

                {customCount === 0 && (
                  <PresetOption
                    active={noAllergies}
                    label={t('home.fitCard.noAllergies')}
                    subtitle={t('home.fitCard.noAllergiesSub')}
                    onClick={pickNoAllergies}
                    variant="allergen"
                  />
                )}

                <div className="fit-sheet__chips">
                  {ALLERGENS.map((allergen) => (
                    <Chip
                      key={allergen.id}
                      active={allergens.includes(allergen.id)}
                      icon={allergen.icon}
                      label={getAllergenShortName(allergen.id, lang)}
                      onClick={() => pickAllergen(allergen.id)}
                      variant="allergen"
                    />
                  ))}
                </div>
                {customCount > 0 ? (
                  <p className="fit-sheet__note">
                    {t('home.fitCard.sheetCustomNote', { count: customCount })}
                  </p>
                ) : null}
              </section>
            </div>

            <div className="fitcheck-drawer__footer">
              <button
                type="button"
                className="fitcheck-drawer__submit"
                onClick={handleSave}
                disabled={saving || !canSave}
              >
                {saving
                  ? t('home.fitSaving')
                  : activeCount > 0
                    ? t('home.fitCard.saveCount', { count: activeCount })
                    : t('home.fitCard.save')}
              </button>

              {onOpenFullPreferences && (
                <button
                  type="button"
                  className="fitcheck-drawer__more-link"
                  onClick={() => {
                    onClose()
                    onOpenFullPreferences()
                  }}
                >
                  {t('home.allSettingsInProfile')}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
