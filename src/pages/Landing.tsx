import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { ThemeToggle } from '../components/ThemeToggle'
import { usePageMeta } from '../hooks/usePageMeta'
import { acceptTerms, hasAcceptedTerms } from '../lib/terms'

interface Props {
  lang?: 'es' | 'en'
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

function MapPinIcon() {
  return (
    <svg {...iconProps} className="benefit__icon">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function MessageIcon() {
  return (
    <svg {...iconProps} className="benefit__icon">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg {...iconProps} className="benefit__icon">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  )
}

const WA_COMPONENTS = { wa: <span className="accent" /> }

export function Landing({ lang }: Props) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [alreadyAccepted] = useState(hasAcceptedTerms)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (lang && i18n.resolvedLanguage !== lang) {
      void i18n.changeLanguage(lang)
    }
  }, [lang, i18n])

  usePageMeta({
    title: t('meta.homeTitle'),
    description: t('meta.homeDescription'),
    path: lang ? `/${lang}` : '/',
    ogImage: i18n.resolvedLanguage === 'en' ? '/og-en.png' : '/og.png',
  })

  const active = i18n.resolvedLanguage

  return (
    <div className="page landing">
      <header className="landing__header">
        <span className="landing__brand">{t('app.name')}</span>
        <div className="landing__controls">
          <nav className="lang-links" aria-label={t('nav.language')}>
            <Link to="/es" className={active === 'es' ? 'lang-links--active' : ''}>
              ES
            </Link>
            <Link to="/en" className={active === 'en' ? 'lang-links--active' : ''}>
              EN
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className="landing__main">
        <section className="landing__hero">
          <h1>{t('app.name')}</h1>
          <p className="landing__tagline">
            <Trans i18nKey="app.tagline" components={WA_COMPONENTS} />
          </p>
          <p className="landing__description">
            <Trans i18nKey="landing.description" components={WA_COMPONENTS} />
          </p>
          {!alreadyAccepted && (
            <label className="terms-check">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              <span>
                <Trans
                  i18nKey="landing.acceptTerms"
                  components={{ eula: <Link to="/eula" />, privacy: <Link to="/privacy" /> }}
                />
              </span>
            </label>
          )}
          <button
            type="button"
            className="btn btn--primary btn--large"
            disabled={!alreadyAccepted && !checked}
            onClick={() => {
              if (!alreadyAccepted) acceptTerms()
              void navigate('/app')
            }}
          >
            {t('landing.enter')}
          </button>
        </section>

        <section className="landing__benefits">
          <h2>{t('landing.benefitsTitle')}</h2>
          <div className="benefit-grid">
            <div className="benefit">
              <MapPinIcon />
              <h3>{t('landing.benefit1Title')}</h3>
              <p>{t('landing.benefit1Text')}</p>
            </div>
            <div className="benefit">
              <MessageIcon />
              <h3>{t('landing.benefit2Title')}</h3>
              <p>{t('landing.benefit2Text')}</p>
            </div>
            <div className="benefit">
              <ShieldIcon />
              <h3>{t('landing.benefit3Title')}</h3>
              <p>{t('landing.benefit3Text')}</p>
            </div>
          </div>
        </section>

        <section className="landing__how">
          <h2>{t('landing.howTitle')}</h2>
          <ol>
            <li>{t('landing.how1')}</li>
            <li>{t('landing.how2')}</li>
            <li>{t('landing.how3')}</li>
          </ol>
        </section>
      </main>

      <footer className="landing__footer">
        <Link to="/eula">{t('footer.eula')}</Link>
        <Link to="/privacy">{t('footer.privacy')}</Link>
      </footer>
    </div>
  )
}
