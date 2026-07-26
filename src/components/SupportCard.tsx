import { useTranslation } from 'react-i18next'
import appConfig from '../config/app-config.json'

/**
 * "Support this project" card (buy-me-a-coffee CTA), shared by the landing and
 * /account. The link comes from app-config (`support_coffee_url`); an empty
 * value hides the card, same rule as SocialsCard.
 */
export function SupportCard({ className = '' }: { className?: string }) {
  const { t } = useTranslation()

  if (!appConfig.support_coffee_url) return null

  return (
    <section className={`landing__support ${className}`.trim()}>
      <h2>{t('landing.supportTitle')}</h2>
      <p>{t('landing.supportText')}</p>
      <a
        href={appConfig.support_coffee_url}
        className="btn btn--primary btn--coffee"
        target="_blank"
        rel="noopener noreferrer"
      >
        ☕ {t('landing.footerCoffee')}
      </a>
    </section>
  )
}
