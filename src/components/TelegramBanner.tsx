import { useTranslation } from 'react-i18next'
import appConfig from '../config/app-config.json'

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden className="tg-banner__icon">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0Zm5.56 8.16-1.86 8.78c-.14.63-.51.78-1.03.48l-2.85-2.1-1.37 1.32c-.15.15-.28.28-.57.28l.2-2.9 5.29-4.78c.23-.2-.05-.32-.36-.12L8.47 13.2l-2.82-.88c-.61-.19-.62-.61.13-.9l11.02-4.25c.51-.19.96.12.76.99Z" />
    </svg>
  )
}

/**
 * Community CTA: for now the Telegram channel doubles as bug/feature reports
 * and customer service. Link comes from app-config (`telegram_url`).
 */
export function TelegramBanner() {
  const { t } = useTranslation()
  return (
    <a
      className="tg-banner"
      href={appConfig.telegram_url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <TelegramIcon />
      <span className="tg-banner__text">
        <strong>{t('community.title')}</strong>
        <span>{t('community.text')}</span>
      </span>
      <span className="tg-banner__cta">{t('community.join')}</span>
    </a>
  )
}
