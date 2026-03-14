import { useEffect, useState } from 'react'

const LANG_KEY = 'korset_lang'

export const dictionaries = {
  ru: {
    langShort: 'Рус',
    langRu: 'Русский',
    langKz: 'Қазақша',
    nav: { home: 'Главная', catalog: 'Каталог', scan: 'Скан', ai: 'ИИ', profile: 'Профиль' },
    home: {
      welcome: 'Добро пожаловать',
      intro: 'Сканируй товары и узнай — подходят ли они именно тебе',
      scanBtn: 'Сканировать штрихкод',
      scanSub: 'Наведи на любой товар в магазине',
      catalog: 'Каталог',
      catalogSub: 'Все товары',
      ai: 'AI помощник',
      aiSub: 'Спроси что угодно',
      how: 'Как это работает',
      steps: [
        'Сканируй штрихкод любого товара в магазине',
        'Körset найдёт состав, аллергены и КБЖУ',
        'AI мгновенно проверит — подходит ли товар тебе',
      ],
    },
    onboarding: {
      title1: 'Этот товар тебе',
      title2: 'подходит?',
      subtitle: 'Скажи что важно — и Körset будет проверять каждый товар за тебя.',
      start: 'Начать сканировать →',
      continueNoSetup: 'Продолжить без настройки',
      skip: 'Пропустить',
      langTitle: 'Язык интерфейса',
      options: {
        halal: ['Халал', 'Только разрешённые продукты'],
        allergy_milk: ['Без молока', 'Аллергия или непереносимость'],
        allergy_gluten: ['Без глютена', 'Целиакия или диета'],
        allergy_nuts: ['Без орехов', 'Аллергия на орехи / арахис'],
        sugar_free: ['Без сахара', 'Диабет, диета или ЗОЖ'],
        vegan: ['Веган', 'Без мяса, молока и яиц'],
      }
    },
    profile: {
      subtitle: 'Настройте профиль — AI мгновенно покажет подходит ли товар вам',
      language: 'Язык интерфейса',
      languageSub: 'Сайт будет отображаться на выбранном языке',
      religion: 'Религиозные требования',
      halalTitle: 'Только Халал',
      halalSub: 'Исключит товары без маркировки',
      diet: 'Диета и предпочтения',
      dietSub: 'Нажмите всё что подходит',
      allergens: 'Мои аллергены',
      allergensSub: 'Товары с этим составом будут помечены ⚠️',
      customHint: 'Не нашли? Введите вручную',
      customPlaceholder: 'Клубника, кунжут...',
      add: '+ Добавить',
      priority: 'Приоритет выбора',
      save: 'Сохранить профиль',
      saved: 'Сохранено',
    }
  },
  kz: {
    langShort: 'Қаз',
    langRu: 'Орысша',
    langKz: 'Қазақша',
    nav: { home: 'Басты бет', catalog: 'Каталог', scan: 'Сканер', ai: 'ИИ', profile: 'Профиль' },
    home: {
      welcome: 'Қош келдіңіз',
      intro: 'Тауарды сканерлеп, оның сізге сай келетінін бірден біліңіз',
      scanBtn: 'Штрихкодты сканерлеу',
      scanSub: 'Дүкендегі кез келген тауарға бағыттаңыз',
      catalog: 'Каталог',
      catalogSub: 'Барлық тауар',
      ai: 'AI көмекші',
      aiSub: 'Кез келген сұрақ қойыңыз',
      how: 'Қалай жұмыс істейді',
      steps: [
        'Дүкендегі кез келген тауардың штрихкодын сканерлеңіз',
        'Körset құрамын, аллергендерін және БЖУ-ын табады',
        'AI тауардың сізге сай келетінін бірден тексереді',
      ],
    },
    onboarding: {
      title1: 'Бұл тауар саған',
      title2: 'сәйкес пе?',
      subtitle: 'Өзіңе маңыздысын таңда — Körset әр тауарды сен үшін тексереді.',
      start: 'Сканерлеуді бастау →',
      continueNoSetup: 'Баптаусыз жалғастыру',
      skip: 'Өткізу',
      langTitle: 'Интерфейс тілі',
      options: {
        halal: ['Халал', 'Тек рұқсат етілген өнімдер'],
        allergy_milk: ['Сүтсіз', 'Аллергия немесе көтере алмау'],
        allergy_gluten: ['Глютенсіз', 'Целиакия немесе диета'],
        allergy_nuts: ['Жаңғақсыз', 'Жаңғақ / жержаңғақ аллергиясы'],
        sugar_free: ['Қантсыз', 'Диабет, диета немесе дұрыс тамақтану'],
        vegan: ['Веган', 'Етсіз, сүтсіз және жұмыртқасыз'],
      }
    },
    profile: {
      subtitle: 'Профильді баптаңыз — AI тауардың сізге сай келетінін бірден көрсетеді',
      language: 'Интерфейс тілі',
      languageSub: 'Сайт таңдалған тілде көрсетіледі',
      religion: 'Діни талаптар',
      halalTitle: 'Тек Халал',
      halalSub: 'Белгісі жоқ тауарларды алып тастайды',
      diet: 'Диета және талғам',
      dietSub: 'Сізге сай келетінін таңдаңыз',
      allergens: 'Менің аллергендерім',
      allergensSub: 'Құрамында осы заттар бар тауарлар ⚠️ деп белгіленеді',
      customHint: 'Тізімде жоқ па? Қолмен енгізіңіз',
      customPlaceholder: 'Құлпынай, күнжіт...',
      add: '+ Қосу',
      priority: 'Таңдау басымдығы',
      save: 'Профильді сақтау',
      saved: 'Сақталды',
    }
  }
}

export function getLang() {
  return localStorage.getItem(LANG_KEY) || 'ru'
}

export function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang)
  window.dispatchEvent(new CustomEvent('korset:lang', { detail: lang }))
}

export function useLang() {
  const [lang, setLangState] = useState(getLang())
  useEffect(() => {
    const onChange = () => setLangState(getLang())
    window.addEventListener('korset:lang', onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener('korset:lang', onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])
  return lang
}

export function useI18n() {
  const lang = useLang()
  const dict = dictionaries[lang] || dictionaries.ru
  return { lang, t: dict }
}
