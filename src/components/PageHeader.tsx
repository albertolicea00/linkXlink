import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'

/**
 * Shared header for the in-app pages (app / account / admin). Desktop shows
 * the app icon + name + current section, plus the language/theme controls.
 * Hidden on mobile — there the bottom NavBar handles navigation and the
 * language/theme options live inside the Account page instead.
 */
export function PageHeader({ section }: { section: string }) {
  const { t } = useTranslation()
  return (
    <header className="app-page__header">
      <h1 className="page-title">
        <Link to="/app" className="page-title__brand">
          <img src="/icons/icon.svg" alt="" className="page-title__logo" />
          <span className="page-title__name">{t('app.name')}</span>
        </Link>
        <span className="page-title__section">{section}</span>
      </h1>
      <div className="app-page__controls">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  )
}
