import { useTranslation } from 'react-i18next'
import appConfig from '../config/app-config.json'

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  return (
    <label className="language-switcher">
      <span className="sr-only">{t('nav.language')}</span>
      <select
        value={i18n.resolvedLanguage}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
        aria-label={t('nav.language')}
      >
        {appConfig.supported_languages.map((lng) => (
          <option key={lng} value={lng}>
            {lng.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  )
}
