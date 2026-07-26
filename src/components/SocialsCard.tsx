import { useTranslation } from 'react-i18next'
import appLinks from '../config/app-links.json'

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  )
}

function TiktokIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-1.79-2.46V9.8a5.77 5.77 0 1 0 4.88 5.7V8.99a7.32 7.32 0 0 0 4.28 1.38V7.28a4.25 4.25 0 0 1-3.22-1.46Z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M12 2c2.72 0 3.06.01 4.12.06 1.07.05 1.79.22 2.43.47.66.25 1.22.6 1.77 1.15.55.55.9 1.11 1.15 1.77.25.64.42 1.36.47 2.43.05 1.06.06 1.4.06 4.12s-.01 3.06-.06 4.12c-.05 1.07-.22 1.79-.47 2.43-.25.66-.6 1.22-1.15 1.77-.55.55-1.11.9-1.77 1.15-.64.25-1.36.42-2.43.47-1.06.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.07-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.77-1.15 4.9 4.9 0 0 1-1.15-1.77c-.25-.64-.42-1.36-.47-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.07.22-1.79.47-2.43.25-.66.6-1.22 1.15-1.77A4.9 4.9 0 0 1 5.45 2.53c.64-.25 1.36-.42 2.43-.47C8.94 2.01 9.28 2 12 2Zm0 1.8c-2.67 0-2.99.01-4.04.06-.82.04-1.27.17-1.56.29-.4.15-.68.34-.98.64-.3.3-.49.58-.64.98-.12.29-.25.74-.29 1.56-.05 1.05-.06 1.37-.06 4.04s.01 2.99.06 4.04c.4.82.17 1.27.29 1.56.15.4.34.68.64.98.3.3.58.49.98.64.29.12.74.25 1.56.29 1.05.05 1.37.06 4.04.06s2.99-.01 4.04-.06c.82-.04 1.27-.17 1.56-.29.4-.15.68-.34.98-.64.3-.3.49-.58.64-.98.12-.29.25-.74.29-1.56.05-1.05.06-1.37.06-4.04s-.01-2.99-.06-4.04c-.04-.82-.17-1.27-.29-1.56a2.6 2.6 0 0 0-.64-.98 2.6 2.6 0 0 0-.98-.64c-.29-.12-.74-.25-1.56-.29-1.05-.05-1.37-.06-4.04-.06Zm0 3.06a5.14 5.14 0 1 1 0 10.28 5.14 5.14 0 0 1 0-10.28Zm0 1.8a3.34 3.34 0 1 0 0 6.68 3.34 3.34 0 0 0 0-6.68Zm5.34-3.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z" />
    </svg>
  )
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.22-6.82-5.96 6.82H1.66l7.49-8.56L1 2.25h6.83l4.86 6.42 5.55-6.42Zm-1.16 17.52h1.83L7.01 4.13H5.04l12.04 15.64Z" />
    </svg>
  )
}

/**
 * "Follow us" card, styled like the support card next to it. Each network shows
 * only when its app-links URL is set; with all three empty the card renders
 * nothing at all (no empty box).
 */
export function SocialsCard() {
  const { t } = useTranslation()

  const networks = [
    {
      url: appLinks.community_twitter_url,
      label: t('landing.socialTwitter'),
      className: 'btn--twitter',
      icon: <TwitterIcon />,
    },
    {
      url: appLinks.community_facebook_url,
      label: t('landing.socialFacebook'),
      className: 'btn--facebook',
      icon: <FacebookIcon />,
    },
    {
      url: appLinks.community_instagram_url,
      label: t('landing.socialInstagram'),
      className: 'btn--instagram',
      icon: <InstagramIcon />,
    },
    {
      url: appLinks.community_tiktok_url,
      label: t('landing.socialTiktok'),
      className: 'btn--tiktok',
      icon: <TiktokIcon />,
    },
  ].filter((n) => !!n.url)

  if (networks.length === 0) return null

  return (
    <section className="landing__support socials-card">
      <h2>{t('landing.socialsTitle')}</h2>
      <p>{t('landing.socialsText')}</p>
      <div className="socials-card__row">
        {networks.map((n) => (
          <a
            key={n.label}
            href={n.url}
            className={`btn ${n.className}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {n.icon}
            {n.label}
          </a>
        ))}
      </div>
    </section>
  )
}
