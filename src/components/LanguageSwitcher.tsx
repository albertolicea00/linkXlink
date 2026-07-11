import { useTranslation } from 'react-i18next'
import appConfig from '../config/app-config.json'

/** Endonyms — each language shown in its own name, so the label is readable
 * regardless of the active UI language. */
const LANG_NAMES: Record<string, string> = {
  es: 'Español',
  en: 'English',
}

/** Same pill UI as the landing lang links, but switches i18n in place
 * (app/admin routes have no per-language URL). With `full`, each option shows
 * its full language name instead of the two-letter code. */
export function LanguageSwitcher({ full = false }: { full?: boolean }) {
  const { i18n, t } = useTranslation()

  return (
    <nav className="lang-links" aria-label={t('nav.language')}>
      {appConfig.supported_languages.map((lng) => (
        <button
          key={lng}
          type="button"
          className={i18n.resolvedLanguage === lng ? 'lang-links--active' : ''}
          onClick={() => void i18n.changeLanguage(lng)}
        >
          {full ? (LANG_NAMES[lng] ?? lng.toUpperCase()) : lng.toUpperCase()}
        </button>
      ))}
    </nav>
  )
}
