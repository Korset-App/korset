// Медицинские состояния для Fit-Check Engine
// Используется в: fitCheck.js, ProfileScreen, OnboardingScreen

// Пороги сахара по UK Traffic Light System (Food Standards Agency)
// https://www.food.gov.uk/safety-hygiene/check-the-label
export const SUGAR_THRESHOLDS = {
  LOW: 5, // ≤5г на 100г = зелёный (низкий)
  HIGH: 22.5, // >22.5г на 100г = красный (высокий)
  // Между 5.1 и 22.5 = жёлтый/оранжевый (средний)
}

// Определения медицинских состояний
export const HEALTH_CONDITIONS = [
  {
    id: 'diabetes',
    label: { ru: 'Сахарный диабет', kz: 'Қант диабеті' },
    description: {
      ru: 'Контроль содержания сахара в продуктах',
      kz: 'Өнімдердегі қант мөлшерін бақылау',
    },
    icon: 'glucose',
    // Тип проверки: numbers (nutriments) + keywords (ingredients)
    checkType: 'nutriment_and_ingredient',
    nutrimentKey: 'sugars', // ключ в nutriments_json
    thresholds: SUGAR_THRESHOLDS,
  },
  {
    id: 'celiac',
    label: { ru: 'Целиакия', kz: 'Целиакия' },
    description: {
      ru: 'Строгое исключение глютена из рациона',
      kz: 'Глютенді тамақтан толық алып тастау',
    },
    icon: 'gastroenterology',
    // Тип проверки: проверяем как аллерген "gluten", но с расширенным словарём
    checkType: 'allergen_strict',
    linkedAllergen: 'gluten',
  },
  {
    id: 'pku',
    label: { ru: 'Фенилкетонурия (ФКУ)', kz: 'Фенилкетонурия (ФКУ)' },
    description: {
      ru: 'Контроль фенилаланина и аспартама',
      kz: 'Фенилаланин мен аспартамды бақылау',
    },
    icon: 'labs',
    // Тип проверки: keywords в ingredients + белок в nutriments
    checkType: 'nutriment_and_ingredient',
    nutrimentKey: 'proteins', // высокий белок = предупреждение
    proteinWarningThreshold: 20, // >20г белка на 100г → warning
  },
]

// Для быстрого доступа по id
export const HEALTH_CONDITIONS_MAP = Object.fromEntries(HEALTH_CONDITIONS.map((hc) => [hc.id, hc]))

// Получить название по id и языку
export function getHealthConditionName(id, lang = 'ru') {
  const hc = HEALTH_CONDITIONS_MAP[id]
  return hc ? hc.label[lang] || hc.label.ru : id
}

// Layout rows для UI (Onboarding / Profile)
export const HEALTH_CONDITION_ROWS = [['diabetes', 'celiac', 'pku']]
