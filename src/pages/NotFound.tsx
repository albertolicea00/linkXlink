import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function NotFound() {
  const { t } = useTranslation()

  return (
    <div className="page legal-page">
      <main>
        <h1>404</h1>
        <p>{t('notFound.title')}</p>
        <Link to="/" className="btn">
          {t('notFound.backHome')}
        </Link>
      </main>
    </div>
  )
}
