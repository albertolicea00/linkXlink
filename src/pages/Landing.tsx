import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../components/LanguageSwitcher'

export function Landing() {
  const { t } = useTranslation()

  return (
    <div className="page landing">
      <header className="landing__header">
        <LanguageSwitcher />
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
              <h3>{t('landing.benefit1Title')}</h3>
              <p>{t('landing.benefit1Text')}</p>
            </div>
            <div className="benefit">
              <h3>{t('landing.benefit2Title')}</h3>
              <p>{t('landing.benefit2Text')}</p>
            </div>
            <div className="benefit">
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
