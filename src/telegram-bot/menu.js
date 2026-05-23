import { InlineKeyboard } from 'grammy'
import { t } from './i18n.js'

export function mainMenu(lang) {
  return new InlineKeyboard()
    .text(t(lang, 'menuFaq'), 'faq')
    .text(t(lang, 'menuAsk'), 'ask')
    .row()
    .text(t(lang, 'menuAbout'), 'about')
}

export function faqMenu(lang) {
  const kb = new InlineKeyboard()
  const items = t(lang, 'faqItems')
  items.forEach((item, i) => {
    kb.text(`${i + 1}`, `faq_${i}`).row()
  })
  kb.text(t(lang, 'back'), 'main_menu')
  return kb
}

export function helpButtons(lang) {
  return new InlineKeyboard()
    .text(t(lang, 'helpYes'), 'resolved')
    .text(t(lang, 'helpNo'), 'transfer')
}

export function backButton(lang) {
  return new InlineKeyboard().text(t(lang, 'back'), 'main_menu')
}
