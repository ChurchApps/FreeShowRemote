import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Import all language files
import ar from './locales/ar.json';
import cs_CZ from './locales/cs_CZ.json';
import de from './locales/de.json';
import en from './locales/en.json';
import en_GB from './locales/en_GB.json';
import en_ZM from './locales/en_ZM.json';
import es from './locales/es.json';
import fi from './locales/fi.json';
import fr_FR from './locales/fr_FR.json';
import hu from './locales/hu.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import lt from './locales/lt.json';
import nl from './locales/nl.json';
import no from './locales/no.json';
import pl from './locales/pl.json';
import pt_BR from './locales/pt_BR.json';
import pt_PT from './locales/pt_PT.json';
import ro from './locales/ro.json';
import ru from './locales/ru.json';
import sk from './locales/sk.json';
import sl from './locales/sl.json';
import sr from './locales/sr.json';
import sv from './locales/sv.json';
import tr from './locales/tr.json';
import ua from './locales/ua.json';
import zh_CN from './locales/zh_CN.json';

const resources = {
  ar: { translation: ar },
  cs: { translation: cs_CZ },
  de: { translation: de },
  en: { translation: en },
  'en-GB': { translation: en_GB },
  'en-ZM': { translation: en_ZM },
  es: { translation: es },
  fi: { translation: fi },
  fr: { translation: fr_FR },
  hu: { translation: hu },
  it: { translation: it },
  ja: { translation: ja },
  ko: { translation: ko },
  lt: { translation: lt },
  nl: { translation: nl },
  no: { translation: no },
  pl: { translation: pl },
  'pt-BR': { translation: pt_BR },
  'pt-PT': { translation: pt_PT },
  pt: { translation: pt_BR }, // Default Portuguese to Brazilian
  ro: { translation: ro },
  ru: { translation: ru },
  sk: { translation: sk },
  sl: { translation: sl },
  sr: { translation: sr },
  sv: { translation: sv },
  tr: { translation: tr },
  uk: { translation: ua }, // Ukrainian uses 'uk' as language code
  zh: { translation: zh_CN }, // Default Chinese to Simplified
  'zh-CN': { translation: zh_CN },
};

const supportedLanguages = Object.keys(resources);

// Get device locale info
const deviceLocale = Localization.getLocales()[0];
const deviceLanguage = deviceLocale?.languageCode ?? 'en';
const deviceRegion = deviceLocale?.regionCode;

// Build full locale tag (e.g., 'en-GB', 'pt-BR')
const fullLocale = deviceRegion ? `${deviceLanguage}-${deviceRegion}` : deviceLanguage;

// Try full locale first, then just language code, then fallback to English
const getLanguage = (): string => {
  if (supportedLanguages.includes(fullLocale)) {
    return fullLocale;
  }
  if (supportedLanguages.includes(deviceLanguage)) {
    return deviceLanguage;
  }
  return 'en';
};

i18n.use(initReactI18next).init({
  resources,
  lng: getLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
