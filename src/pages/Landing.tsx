import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from '../components/ThemeToggle'

interface Props {
  lang?: 'es' | 'en'
}

export function Landing({ lang }: Props) {
  const { t, i18n } = useTranslation()

  useEffect(() => {
    if (lang && i18n.resolvedLanguage !== lang) {
      void i18n.changeLanguage(lang)
    }
  }, [lang, i18n])

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
          <p className="landing__tagline">{t('app.tagline')}</p>
          <p className="landing__description">{t('landing.description')}</p>
          <Link to="/app" className="btn btn--primary btn--large">
            {t('landing.enter')}
          </Link>
        </section>

        <section className="landing__benefits">
          <h2>{t('landing.benefitsTitle')}</h2>
          <div className="benefit-grid">
            <div className="benefit">
              <span className="benefit__icon" aria-hidden="true">
                📍
              </span>
              <h3>{t('landing.benefit1Title')}</h3>
              <p>{t('landing.benefit1Text')}</p>
            </div>
            <div className="benefit">
              <span className="benefit__icon" aria-hidden="true">
                💬
              </span>
              <h3>{t('landing.benefit2Title')}</h3>
              <p>{t('landing.benefit2Text')}</p>
            </div>
            <div className="benefit">
              <span className="benefit__icon" aria-hidden="true">
                🛡️
              </span>
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
