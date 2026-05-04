// Единый источник данных об аллергенах (ТР ТС 022/2011)
// 14 обязательных аллергенов по Техническому Регламенту Таможенного Союза
// Используется в: ProfileScreen, fitCheck

export const ALLERGENS = [
  // ★★★★★ Самые распространённые (показываются первыми)
  {
    id: 'milk',
    label: { ru: 'Молоко и лактоза', kz: 'Сүт және лактоза' },
    icon: 'milk',
    frequency: 5,
  },
  { id: 'eggs', label: { ru: 'Яйца', kz: 'Жұмыртқа' }, icon: 'egg', frequency: 5 },
  {
    id: 'gluten',
    label: { ru: 'Глютен (пшеница, рожь, ячмень)', kz: 'Глютен (бидай, қара бидай, арпа)' },
    icon: 'wheat',
    frequency: 5,
  },
  { id: 'peanuts', label: { ru: 'Арахис', kz: 'Жержаңғақ' }, icon: 'peanut', frequency: 4 },
  {
    id: 'tree_nuts',
    label: { ru: 'Орехи (миндаль, фундук, кешью...)', kz: 'Жаңғақтар' },
    icon: 'nuts',
    frequency: 4,
  },
  { id: 'soy', label: { ru: 'Соя', kz: 'Соя' }, icon: 'soy', frequency: 3 },

  // ★★★☆☆ Средняя распространённость
  { id: 'fish', label: { ru: 'Рыба', kz: 'Балық' }, icon: 'fish', frequency: 3 },
  {
    id: 'crustaceans',
    label: { ru: 'Ракообразные (креветки, крабы)', kz: 'Шаян тәрізділер' },
    icon: 'shell',
    frequency: 2,
  },
  { id: 'sesame', label: { ru: 'Кунжут', kz: 'Күнжіт' }, icon: 'sesame', frequency: 3 },
  { id: 'celery', label: { ru: 'Сельдерей', kz: 'Балдыркөк' }, icon: 'nutrition', frequency: 2 },
  { id: 'mustard', label: { ru: 'Горчица', kz: 'Қыша' }, icon: 'nutrition', frequency: 2 },
  {
    id: 'sulfites',
    label: { ru: 'Сульфиты (E220-E228)', kz: 'Сульфиттер' },
    icon: 'science',
    frequency: 2,
  },

  // ★☆☆☆☆ Редкие (скрыты по умолчанию, доступны через "Показать все")
  {
    id: 'mollusks',
    label: { ru: 'Моллюски (мидии, кальмары)', kz: 'Жұмсақ денелілер' },
    icon: 'shell',
    frequency: 1,
  },
  { id: 'lupin', label: { ru: 'Люпин', kz: 'Люпин' }, icon: 'nutrition', frequency: 1 },
]

// Порог частоты для "Показать все" в UI
export const ALLERGEN_FREQUENCY_THRESHOLD = 2 // frequency >= 2 показываются сразу

// Маппинг id → русское название (для fitCheck, ExternalProductScreen)
export const ALLERGEN_NAMES = Object.fromEntries(ALLERGENS.map((a) => [a.id, a.label.ru]))

// Маппинг id → двуязычное название
export function getAllergenName(id, lang = 'ru') {
  const a = ALLERGENS.find((x) => x.id === id)
  return a ? a.label[lang] || a.label.ru : id
}

// Маппинг Open Food Facts тегов → наш id
export const OFF_ALLERGEN_MAP = {
  'en:milk': 'milk',
  'en:gluten': 'gluten',
  'en:nuts': 'tree_nuts',
  'en:peanuts': 'peanuts',
  'en:soybeans': 'soy',
  'en:eggs': 'eggs',
  'en:fish': 'fish',
  'en:crustaceans': 'crustaceans',
  'en:molluscs': 'mollusks',
  'en:wheat': 'gluten',
  'en:sesame-seeds': 'sesame',
  'en:celery': 'celery',
  'en:mustard': 'mustard',
  'en:lupin': 'lupin',
  'en:sulphur-dioxide-and-sulphites': 'sulfites',
}

// Миграция старых ID → новые ID (обратная совместимость)
export const ALLERGEN_MIGRATION_MAP = {
  nuts: 'tree_nuts',
  shellfish: 'crustaceans',
  honey: null, // убрали из стандартных, пользователь может добавить в customAllergens
}
