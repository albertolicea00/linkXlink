import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import appLinks from '../config/app-links.json'
import { withUtm } from '../lib/utm'

/**
 * Legal links + author credit. Shared by the pages that sit outside the app
 * chrome (landing, register) — those have no NavBar, so the footer is where the
 * legal pages are reachable from.
 */
export function SiteFooter() {
  const { t } = useTranslation()

  return (
    <footer className="landing__footer">
      <div className="landing__footer-links">
        <Link to="/eula">{t('footer.eula')}</Link>
        <Link to="/privacy">{t('footer.privacy')}</Link>
        <Link to="/data">{t('footer.data')}</Link>
      </div>
      <div className="landing__footer-credits">
        <p>
          {t('landing.footerMadeWith')}
          <a href={withUtm(appLinks.author_website_url, 'author')} target="_blank" rel="noopener noreferrer">
            {appLinks.author_handle}
          </a>
        </p>
      </div>
    </footer>
  )
}
