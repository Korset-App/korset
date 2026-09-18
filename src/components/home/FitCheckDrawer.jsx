import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../../i18n/index.js'
import { ALLERGENS } from '../../constants/allergens.js'
import { DIET_PREFERENCES } from '../../constants/dietGoals.js'
import { DietIcon } from '../../screens/ProfileScreen.jsx'
import './FitCheckDrawer.css'

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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      setDraftHalal(Boolean(profile.halal || profile.halalOnly))
      setDraftDietGoals(profile.dietGoals || [])
      setDraftAllergens(profile.allergens || [])
      setDraftNoRestrictions(Boolean(profile.noDietPreferences && profile.noAllergies))
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
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

  const primaryAllergens = ALLERGENS.slice(0, 6)
  const primaryDiets = DIET_PREFERENCES.filter((d) => d.id !== 'halal')

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fitcheck-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            role="button"
            tabIndex={-1}
            aria-label={t('common.close')}
          />
          <motion.div
            className="fitcheck-drawer"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            role="dialog"
            aria-modal="true"
            aria-label={t('home.shieldTitle') || 'Fit-Check'}
          >
            <div className="fitcheck-drawer__handle" />

            <div className="fitcheck-drawer__header">
              <div className="fitcheck-drawer__title-wrap">
                <div className="fitcheck-drawer__icon">
                  <span className="material-symbols-outlined">shield_with_heart</span>
                </div>
                <div>
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
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  close
                </span>
              </button>
            </div>

            <div className="fitcheck-drawer__section-title">
              {t('home.fitPreferencesTitle') || 'Особенности питания'}
            </div>
            <div className="fitcheck-drawer__chips">
              <button
                type="button"
                className={`fitcheck-chip${draftHalal && !draftNoRestrictions ? ' is-active' : ''}`}
                onClick={toggleHalal}
              >
                <DietIcon name="halal" size={18} />
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
                    <DietIcon name={diet.icon} size={18} />
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>

            <div className="fitcheck-drawer__section-title">
              {t('home.fitAllergensTitle') || 'Частые аллергены'}
            </div>
            <div className="fitcheck-drawer__chips">
              {primaryAllergens.map((allergen) => {
                const isActive = draftAllergens.includes(allergen.id) && !draftNoRestrictions
                const label = allergen.label?.[lang] || allergen.label?.ru || allergen.id
                return (
                  <button
                    key={allergen.id}
                    type="button"
                    className={`fitcheck-chip${isActive ? ' is-active' : ''}`}
                    onClick={() => toggleAllergen(allergen.id)}
                  >
                    <DietIcon name={allergen.icon} size={18} />
                    <span>{label}</span>
                  </button>
                )
              })}

              <button
                type="button"
                className={`fitcheck-chip fitcheck-chip--reset${draftNoRestrictions ? ' is-active' : ''}`}
                onClick={toggleNoRestrictions}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  check_circle
                </span>
                <span>{t('home.noPreferences') || 'Без ограничений'}</span>
              </button>
            </div>

            <div className="fitcheck-drawer__actions">
              <button
                type="button"
                className="fitcheck-drawer__submit"
                onClick={handleSave}
                disabled={saving}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  check
                </span>
                <span>{t('home.drawerSave') || 'Сохранить настройки'}</span>
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
                  <span>{t('home.moreInfo') || 'Подробнее'}</span>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
