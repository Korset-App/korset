import { ArrowBackIcon, CloseIcon } from '../icons/index.js'
import { getCuratedQuickSuggestions } from '../../domain/ai/recipes/recipeRegistry.js'
import { AIProfileFilterBadge } from './AIProfileFilterBadge.jsx'

export function AIRecipeWizardDock({
  step = 1,
  selectedDish = null,
  lang = 'ru',
  onSelectDish,
  onSelectBudget,
  onBack,
  onCancel,
  profile = null,
  profileFilterActive = true,
  onToggleProfileFilter,
}) {
  const quickDishes = getCuratedQuickSuggestions(lang)

  const budgetOptions = [
    { id: 'any', label: lang === 'kz' ? 'Кез келген' : 'Любой бюджет', budget: null },
    { id: '3000', label: lang === 'kz' ? '3 000 ₸ дейін' : 'До 3 000 ₸', budget: 3000 },
    { id: '6000', label: lang === 'kz' ? '6 000 ₸ дейін' : 'До 6 000 ₸', budget: 6000 },
  ]

  return (
    <div className="ai-recipe-wizard" role="region" aria-label={lang === 'kz' ? 'Мәзір құрастырушы' : 'Конструктор корзины'}>
      <div className="ai-recipe-wizard__header">
        <div className="ai-recipe-wizard__meta">
          <span className="ai-recipe-wizard__step-badge">
            {step === 1 ? (lang === 'kz' ? '1/2 Қадам: Тағам' : '1/2 Шаг: Блюдо') : (lang === 'kz' ? '2/2 Қадам: Бюджет' : '2/2 Шаг: Бюджет')}
          </span>
          <span className="ai-recipe-wizard__prompt">
            {step === 1
              ? lang === 'kz'
                ? 'Қандай тағамға немесе оқиғаға сатып аламыз?'
                : 'Какое блюдо или повод для корзины?'
              : lang === 'kz'
                ? `«${selectedDish}» үшін бюджетіңіз қандай?`
                : `Бюджет на «${selectedDish}»?`}
          </span>
        </div>
        <div className="ai-recipe-wizard__actions">
          {step === 2 && (
            <button
              type="button"
              onClick={onBack}
              className="ai-recipe-wizard__icon-btn"
              title={lang === 'kz' ? 'Артқа' : 'Назад'}
              aria-label={lang === 'kz' ? 'Артқа' : 'Назад'}
            >
              <ArrowBackIcon size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="ai-recipe-wizard__icon-btn"
            title={lang === 'kz' ? 'Бас тарту' : 'Отменить'}
            aria-label={lang === 'kz' ? 'Бас тарту' : 'Отменить'}
          >
            <CloseIcon size={16} />
          </button>
        </div>
      </div>

      <div className="ai-recipe-wizard__bar">
        {step === 1 ? (
          <div className="ai-recipe-wizard__chips">
            {quickDishes.map((item) => (
              <button
                key={item.id}
                type="button"
                className="ai-recipe-chip"
                onClick={() => onSelectDish(item.dish)}
              >
                <span className="ai-recipe-chip__label">{item.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="ai-recipe-wizard__chips">
            {budgetOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                className="ai-recipe-chip"
                onClick={() => onSelectBudget(item.budget)}
              >
                <span className="ai-recipe-chip__label">{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {profile && (
          <AIProfileFilterBadge
            profile={profile}
            enabled={profileFilterActive}
            onToggle={onToggleProfileFilter}
            lang={lang}
          />
        )}
      </div>
    </div>
  )
}
