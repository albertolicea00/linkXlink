import { useTranslation } from 'react-i18next'
import appConfig from '../config/app-config.json'

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden className="tg-banner__icon">
      <path d="M12 0a11.94 11.94 0 0 0-10.2 18.16L0 24l5.98-1.57A11.94 11.94 0 1 0 12 0Zm0 21.82a9.86 9.86 0 0 1-5.03-1.38l-.36-.21-3.55.93.95-3.46-.24-.36A9.88 9.88 0 1 1 12 21.82Zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  )
}

/**
 * Community CTA for the WhatsApp group — same shape as the Telegram banner,
 * green WhatsApp styling. Link comes from app-config (`community_whatsapp_url`);
 * renders nothing while that URL is empty (feature not configured yet).
 */
export function WhatsAppBanner() {
  const { t } = useTranslation()
  if (!appConfig.community_whatsapp_url) return null
  return (
    <a
      className="tg-banner tg-banner--whatsapp"
      href={appConfig.community_whatsapp_url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <WhatsAppIcon />
      <span className="tg-banner__text">
        <strong>{t('community.whatsappTitle')}</strong>
        <span>{t('community.text')}</span>
      </span>
      <span className="tg-banner__cta">{t('community.join')}</span>
    </a>
  )
}
