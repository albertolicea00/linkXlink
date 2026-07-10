import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'

/**
 * Shared header for the in-app pages (app / account / admin). Desktop shows
 * "Link x Link - <section>"; mobile shows just the section name. All pink.
 * Navigation lives in the NavBar, so no links/logout here beyond the brand.
 */
export function PageHeader({ section }: { section: string }) {
  const { t } = useTranslation()
  return (
    <header className="app-page__header">
      <h1 className="page-title">
        <span className="page-title__section">{section}</span>
        <span className="page-title__sep">&nbsp;&nbsp;::&nbsp;&nbsp;</span>
        <Link to="/app" className="page-title__brand">
          {t('app.name')}
        </Link>
      </h1>
      <div className="app-page__controls">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  )
}
