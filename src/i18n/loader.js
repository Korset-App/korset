import ruCommon from '../locales/ru/common.json'
import ruHome from '../locales/ru/home.json'
import ruScan from '../locales/ru/scan.json'
import ruProduct from '../locales/ru/product.json'
import ruCompare from '../locales/ru/compare.json'
import ruAlternatives from '../locales/ru/alternatives.json'
import ruAi from '../locales/ru/ai.json'
import ruSettings from '../locales/ru/settings.json'
import ruRetail from '../locales/ru/retail.json'
import ruQr from '../locales/ru/qr.json'
import ruProfile from '../locales/ru/profile.json'
import ruHistory from '../locales/ru/history.json'
import ruAuth from '../locales/ru/auth.json'
import ruFaq from '../locales/ru/faq.json'

import kzCommon from '../locales/kz/common.json'
import kzHome from '../locales/kz/home.json'
import kzScan from '../locales/kz/scan.json'
import kzProduct from '../locales/kz/product.json'
import kzCompare from '../locales/kz/compare.json'
import kzAlternatives from '../locales/kz/alternatives.json'
import kzAi from '../locales/kz/ai.json'
import kzSettings from '../locales/kz/settings.json'
import kzRetail from '../locales/kz/retail.json'
import kzQr from '../locales/kz/qr.json'
import kzProfile from '../locales/kz/profile.json'
import kzHistory from '../locales/kz/history.json'
import kzAuth from '../locales/kz/auth.json'
import kzFaq from '../locales/kz/faq.json'

const dicts = {
  ru: Object.assign(
    {},
    ruCommon,
    ruHome,
    ruScan,
    ruProduct,
    ruCompare,
    ruAlternatives,
    ruAi,
    ruSettings,
    ruRetail,
    ruQr,
    ruProfile,
    ruHistory,
    ruAuth,
    ruFaq
  ),
  kz: Object.assign(
    {},
    kzCommon,
    kzHome,
    kzScan,
    kzProduct,
    kzCompare,
    kzAlternatives,
    kzAi,
    kzSettings,
    kzRetail,
    kzQr,
    kzProfile,
    kzHistory,
    kzAuth,
    kzFaq
  ),
}

const cache = {}

export function loadDict(lang) {
  if (cache[lang]) return cache[lang]
  const dict = dicts[lang] || dicts.ru
  cache[lang] = dict
  return dict
}

export function clearCache() {
  Object.keys(cache).forEach((k) => delete cache[k])
}
