import { useI18n } from '../../i18n/index.js'
import { getAllergenShortName } from '../../constants/allergens.js'
import { DIET_PREFERENCES } from '../../constants/dietGoals.js'
import { DietIcon } from '../icons/index.js'
import { FitCheckIcon } from '../icons/FitCheckIcon.jsx'
import { getFitProfileStatus } from '../../utils/fitProfileStatus.js'
import './FitProfileCard.css'

export default function FitProfileCard({ profile, onOpen }) {
  const { lang, t } = useI18n()
  const status = getFitProfileStatus(profile)

  // Formatting Diet value
  let dietText = t('home.fitCard.notSet') || 'Не указано'
  let dietFillClass = ''
  if (status.hasDiet) {
    const list = [
      ...(status.halal ? [t('home.preferenceHalal') || 'Халал'] : []),
      ...status.diets.map((id) => {
        const item = DIET_PREFERENCES.find((d) => d.id === id)
        return item?.label?.[lang] || item?.label?.ru || id
      }),
    ]
    if (list.length === 1) {
      dietText = list[0]
    } else if (list.length === 2) {
      dietText = list.join(', ')
    } else {
      dietText = `${list[0]}, ${list[1]} +${list.length - 2}`
    }
    dietFillClass = 'is-active-diet'
  } else if (status.noDiet) {
    dietText = t('home.fitCard.noRestrictions') || 'Без ограничений'
    dietFillClass = 'is-none'
  }

  // Formatting Allergens value
  let allergensText = t('home.fitCard.notSet') || 'Не указано'
  let allergensFillClass = ''
  const totalAllergens = status.allergens.length + status.customAllergens.length
  if (status.hasAllergens) {
    if (totalAllergens === 1) {
      const firstId = status.allergens[0]
      allergensText = firstId
        ? getAllergenShortName(firstId, lang)
        : status.customAllergens[0] || '1 аллерген'
    } else if (totalAllergens === 2 && status.allergens.length === 2) {
      allergensText = `${getAllergenShortName(status.allergens[0], lang)}, ${getAllergenShortName(status.allergens[1], lang)}`
    } else {
      allergensText = (t('home.fitCard.allergensCount') || '{{count}} аллерг.').replace(
        '{{count}}',
        totalAllergens
      )
    }
    allergensFillClass = 'is-active-allergen'
  } else if (status.noAllergies) {
    allergensText = t('home.fitCard.noAllergies') || 'Аллергий нет'
    allergensFillClass = 'is-none'
  }

  return (
    <section className="fit-card" aria-label={t('home.fitCard.title') || 'Мой Fit-Check'}>
      {/* 1. Header */}
      <div className="fit-card__head">
        <div
          className={`fit-card__emblem${status.activeCount > 0 ? ' is-active' : ''}`}
          aria-hidden="true"
        >
          <FitCheckIcon size={24} active={status.activeCount > 0} />
        </div>
        <div className="fit-card__titles">
          <div className="fit-card__title-row">
            <h3 className="fit-card__title">{t('home.fitCard.title') || 'Мой Fit-Check'}</h3>
            <span className={`fit-card__status-pill${status.complete ? ' is-complete' : ''}`}>
              {status.complete
                ? t('home.fitCard.statusConfigured') || 'Настроено'
                : t('home.fitCard.statusPending') || 'Не завершено'}
            </span>
          </div>
          <p className="fit-card__sub">
            {status.complete
              ? t('home.fitCard.subActive') || 'Персональная проверка активна для каждого товара'
              : t('home.fitCard.subEmpty') || 'Проверка на аллергены, халал и состав'}
          </p>
        </div>
      </div>

      {/* 2. Interactive 2-Group Dashboard (Предпочтения и Аллергены) */}
      <div className="fit-card__grid" role="group" aria-label={t('home.fitCard.title')}>
        {/* Left: Preferences */}
        <button
          type="button"
          className={`fit-card__tile fit-card__tile--diet${
            status.dietDecided ? ' is-decided' : ''
          }${status.noDiet ? ' is-none' : ''}`}
          onClick={() => onOpen('diet')}
          aria-label={`${t('home.fitCard.stepDiet') || 'Предпочтения'}: ${dietText}`}
        >
          <div className="fit-card__tile-top">
            <span className="fit-card__tile-title-group">
              <span className="fit-card__tile-icon" aria-hidden="true">
                <DietIcon name={status.halal ? 'halal' : status.diets?.[0] || 'halal'} size={18} />
              </span>
              <span className="fit-card__tile-label">
                {t('home.fitCard.stepDiet') || 'Предпочтения'}
              </span>
            </span>
          </div>

          <div className={`fit-card__tile-value${status.dietDecided ? ' is-decided' : ''}`}>
            {dietText}
          </div>

          {/* Dynamic Progress Bar */}
          <div className="fit-card__bar-track" aria-hidden="true">
            <div className={`fit-card__bar-fill ${dietFillClass}`} />
          </div>
        </button>

        {/* Right: Allergens */}
        <button
          type="button"
          className={`fit-card__tile fit-card__tile--allergen${
            status.allergensDecided ? ' is-decided' : ''
          }${status.noAllergies ? ' is-none' : ''}`}
          onClick={() => onOpen('allergens')}
          aria-label={`${t('home.fitCard.stepAllergens') || 'Аллергены'}: ${allergensText}`}
        >
          <div className="fit-card__tile-top">
            <span className="fit-card__tile-title-group">
              <span
                className="fit-card__tile-icon fit-card__tile-icon--allergen"
                aria-hidden="true"
              >
                <DietIcon name="peanut" size={18} />
              </span>
              <span className="fit-card__tile-label">
                {t('home.fitCard.stepAllergens') || 'Аллергены'}
              </span>
            </span>
          </div>

          <div className={`fit-card__tile-value${status.allergensDecided ? ' is-decided' : ''}`}>
            {allergensText}
          </div>

          {/* Dynamic Progress Bar */}
          <div className="fit-card__bar-track" aria-hidden="true">
            <div className={`fit-card__bar-fill ${allergensFillClass}`} />
          </div>
        </button>
      </div>

      {/* 3. Single Full-Width Primary Action */}
      <div className="fit-card__actions">
        <button
          type="button"
          className="fit-card__btn fit-card__btn--primary"
          onClick={() => onOpen(null)}
        >
          <FitCheckIcon size={17} />
          <span>
            {status.complete
              ? t('home.fitCard.btnEdit') || 'Изменить параметры'
              : t('home.fitCard.btnSetup') || 'Настроить параметры'}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="fit-card__btn-arrow"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </section>
  )
}
