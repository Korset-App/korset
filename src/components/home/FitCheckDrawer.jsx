import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../../i18n/index.js'
import { ALLERGENS } from '../../constants/allergens.js'
import { DIET_PREFERENCES } from '../../constants/dietGoals.js'
import { CloseIcon, CheckCircleIcon, DietIcon, SlidersIcon } from '../../components/icons/index.js'
import './FitCheckDrawer.css'

const PRIMARY_ALLERGEN_IDS = ['milk', 'eggs', 'gluten', 'peanuts', 'tree_nuts', 'soy']

export default function FitCheckDrawer({
  open,
  onClose,
  profile = {},
  updateProfile,
  onOpenFullPreferences,
}) {
  const { lang, t } = useI18n()
  const [draftHalal, setDraftHalal] = useState(Boolean(profile.halal || profile.halalOnly))
  const [draftDietGoals, setDraftDietGoals] = useState(profile.dietGoals || [])
  const [draftAllergens, setDraftAllergens] = useState(profile.allergens || [])
  const [draftNoRestrictions, setDraftNoRestrictions] = useState(
    Boolean(profile.noDietPreferences && profile.noAllergies)
  )
  const [showAllAllergens, setShowAllAllergens] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      document.documentElement.classList.add('fitcheck-drawer-open')
      document.body.classList.add('fitcheck-drawer-open')
      setDraftHalal(Boolean(profile.halal || profile.halalOnly))
      setDraftDietGoals(profile.dietGoals || [])
      setDraftAllergens(profile.allergens || [])
      setDraftNoRestrictions(Boolean(profile.noDietPreferences && profile.noAllergies))
      setShowAllAllergens(false)
    } else {
      document.documentElement.classList.remove('fitcheck-drawer-open')
      document.body.classList.remove('fitcheck-drawer-open')
    }
    return () => {
      document.documentElement.classList.remove('fitcheck-drawer-open')
      document.body.classList.remove('fitcheck-drawer-open')
    }
  }, [open, profile])

  function toggleHalal() {
    setDraftNoRestrictions(false)
    setDraftHalal((prev) => !prev)
  }

  function toggleDiet(id) {
    setDraftNoRestrictions(false)
    setDraftDietGoals((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  function toggleAllergen(id) {
    setDraftNoRestrictions(false)
    setDraftAllergens((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  function toggleNoRestrictions() {
    setDraftNoRestrictions(true)
    setDraftHalal(false)
    setDraftDietGoals([])
    setDraftAllergens([])
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (draftNoRestrictions) {
        await updateProfile({
          halal: false,
          halalOnly: false,
          dietGoals: [],
          allergens: [],
          noDietPreferences: true,
          noAllergies: true,
        })
      } else {
        await updateProfile({
          halal: draftHalal,
          halalOnly: draftHalal,
          dietGoals: draftDietGoals,
          allergens: draftAllergens,
          noDietPreferences: false,
          noAllergies: draftAllergens.length === 0,
        })
      }
      onClose()
    } catch (err) {
      console.error('Failed to save Fit-Check preferences', err)
    } finally {
      setSaving(false)
    }
  }

  const primaryDiets = DIET_PREFERENCES.filter((d) => d.id !== 'halal')
  const visibleAllergens = showAllAllergens
    ? ALLERGENS
    : ALLERGENS.filter((a) => PRIMARY_ALLERGEN_IDS.includes(a.id) || draftAllergens.includes(a.id))
  const remainingCount = ALLERGENS.length - visibleAllergens.length

  const activeCount = draftNoRestrictions
    ? 0
    : (draftHalal ? 1 : 0) + draftDietGoals.length + draftAllergens.length

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
            aria-label={t('home.shieldTitle') || 'Fit-Check'}
          >
            <div className="fitcheck-drawer__handle-wrap">
              <div className="fitcheck-drawer__handle" />
            </div>

            <div className="fitcheck-drawer__header">
              <div className="fitcheck-drawer__title-wrap">
                <div className="fitcheck-drawer__icon">
                  <SlidersIcon size={20} color="var(--primary-bright)" />
                </div>
                <div className="fitcheck-drawer__titles">
                  <h3 className="fitcheck-drawer__title">
                    {t('home.drawerTitle') || 'Персональный Fit-Check'}
                  </h3>
                  <p className="fitcheck-drawer__subtitle">
                    {t('home.drawerSubtitle') || 'Выберите то, о чем Körset должен предупреждать'}
                  </p>
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
              <div className="fitcheck-drawer__section-title">
                {t('home.fitPreferencesTitle') || 'Особенности питания'}
              </div>
              <div className="fitcheck-drawer__chips">
                <button
                  type="button"
                  className={`fitcheck-chip${draftHalal && !draftNoRestrictions ? ' is-active' : ''}`}
                  onClick={toggleHalal}
                >
                  <DietIcon name="halal" size={17} />
                  <span>{t('home.preferenceHalal') || 'Халал'}</span>
                </button>

                {primaryDiets.map((diet) => {
                  const isActive = draftDietGoals.includes(diet.id) && !draftNoRestrictions
                  const label = diet.label?.[lang] || diet.label?.ru || diet.id
                  return (
                    <button
                      key={diet.id}
                      type="button"
                      className={`fitcheck-chip${isActive ? ' is-active' : ''}`}
                      onClick={() => toggleDiet(diet.id)}
                    >
                      <DietIcon name={diet.icon} size={17} />
                      <span>{label}</span>
                    </button>
                  )
                })}
              </div>

              <div className="fitcheck-drawer__section-title">
                {t('home.fitAllergensTitle') || 'Аллергены'}
              </div>
              <div className="fitcheck-drawer__chips">
                {visibleAllergens.map((allergen) => {
                  const isActive = draftAllergens.includes(allergen.id) && !draftNoRestrictions
                  const label = allergen.label?.[lang] || allergen.label?.ru || allergen.id
                  return (
                    <button
                      key={allergen.id}
                      type="button"
                      className={`fitcheck-chip${isActive ? ' is-active' : ''}`}
                      onClick={() => toggleAllergen(allergen.id)}
                    >
                      <DietIcon name={allergen.icon} size={17} />
                      <span>{label}</span>
                    </button>
                  )
                })}

                {/* Expand / Collapse all 14 allergens */}
                <button
                  type="button"
                  className="fitcheck-chip fitcheck-chip--expand"
                  onClick={() => setShowAllAllergens((prev) => !prev)}
                  aria-expanded={showAllAllergens}
                >
                  {showAllAllergens ? (
                    <span>{t('home.allergensCollapse') || 'Свернуть аллергены'}</span>
                  ) : (
                    <span>
                      {remainingCount > 0
                        ? t('home.allergensExpand', { count: remainingCount }) ||
                          `+ Ещё ${remainingCount} аллергенов`
                        : t('home.allergensCollapse') || 'Все аллергены'}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className={`fitcheck-chip fitcheck-chip--reset${draftNoRestrictions ? ' is-active' : ''}`}
                  onClick={toggleNoRestrictions}
                >
                  <CheckCircleIcon size={17} />
                  <span>{t('home.noPreferences') || 'Без ограничений'}</span>
                </button>
              </div>
            </div>

            <div className="fitcheck-drawer__footer">
              <button
                type="button"
                className="fitcheck-drawer__submit"
                onClick={handleSave}
                disabled={saving}
              >
                <CheckCircleIcon size={19} />
                <span>
                  {saving
                    ? t('common.saving') || 'Сохранение...'
                    : activeCount > 0
                      ? `${t('home.fitSaveCount') || 'Применить'} (${activeCount})`
                      : t('home.fitSaveCount') || 'Применить'}
                </span>
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
                  <span>{t('home.allSettingsInProfile') || 'Все настройки в профиле'}</span>
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
