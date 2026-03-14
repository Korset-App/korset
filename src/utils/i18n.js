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
      langTitle: 'Выберите язык',
      step1Title: 'Сканируй и узнай всё о товаре',
      step1Sub: '',
      step2Title: 'Выбери свои предпочтения',
      step2Sub: 'Отметь важные фильтры. Потом всё можно изменить в профиле.',
      step3Title: 'Добавь аллергены и исключения',
      step3Sub: 'Мы предупредим, если в составе есть то, чего ты избегаете.',
      next: 'Далее',
      back: 'Назад',
      finish: 'Сохранить и продолжить',
      customPlaceholder: 'Например: желатин, дрожжи...',
      add: 'Добавить',
      featuresTitle: 'Körset умеет',
      features: {
        fit: 'Подходит ли тебе',
        halal: 'Халал',
        allergens: 'Аллергены',
        ai: 'Чат с ИИ',
        alternatives: 'Альтернативы',
        facts: 'Состав и КБЖУ'
      }
    },
    profile: {
      subtitle: 'Настройте профиль — AI мгновенно покажет подходит ли товар вам',
      language: 'Язык интерфейса',
      languageSub: 'Сайт будет отображаться на выбранном языке',
      religion: 'Религиозные требования',
      halalTitle: 'Только Халал',
      halalSub: 'Исключит товары без маркировки',
      diet: 'Предпочтения',
      dietSub: 'Выберите всё, что важно именно вам',
      allergens: 'Аллергены и исключения',
      allergensSub: 'Если товар содержит это, Körset сразу предупредит',
      customHint: 'Не нашли в списке? Добавьте своё исключение',
      customPlaceholder: 'Например: мёд, желатин...',
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
      langTitle: 'Тілді таңдаңыз',
      step1Title: 'Сканерле де, тауар туралы бәрін біл',
      step1Sub: '',
      step2Title: 'Өзіңе маңыздыны таңда',
      step2Sub: 'Басты сүзгілерді белгіле. Кейін бәрін профильден өзгерте аласың.',
      step3Title: 'Аллергендер мен шектеулерді қос',
      step3Sub: 'Құрамында сен аулақ болатын нәрсе болса, Körset бірден ескертеді.',
      next: 'Келесі',
      back: 'Артқа',
      finish: 'Сақтап, жалғастыру',
      customPlaceholder: 'Мысалы: желатин, ашытқы...',
      add: 'Қосу',
      featuresTitle: 'Körset мүмкіндіктері',
      features: {
        fit: 'Саған сай ма',
        halal: 'Халал',
        allergens: 'Аллергендер',
        ai: 'ЖИ чат',
        alternatives: 'Баламалар',
        facts: 'Құрамы мен БЖУ'
      }
    },
    profile: {
      subtitle: 'Профильді баптаңыз — AI тауардың сізге сай келетінін бірден көрсетеді',
      language: 'Интерфейс тілі',
      languageSub: 'Сайт таңдалған тілде көрсетіледі',
      religion: 'Діни талаптар',
      halalTitle: 'Тек Халал',
      halalSub: 'Белгісі жоқ тауарларды алып тастайды',
      diet: 'Талғам мен сүзгілер',
      dietSub: 'Өзіңізге маңыздысының бәрін таңдаңыз',
      allergens: 'Аллергендер мен шектеулер',
      allergensSub: 'Құрамында осы нәрселер болса, Körset бірден ескертеді',
      customHint: 'Тізімде жоқ па? Өз шектеуіңізді қосыңыз',
      customPlaceholder: 'Мысалы: бал, желатин...',
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
