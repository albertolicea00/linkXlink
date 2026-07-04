import { useTranslation } from 'react-i18next'
import appConfig from '../config/app-config.json'

/** Same pill UI as the landing lang links, but switches i18n in place
 * (app/admin routes have no per-language URL). */
export function LanguageSwitcher() {
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
          {lng.toUpperCase()}
        </button>
      ))}
    </nav>
  )
}
