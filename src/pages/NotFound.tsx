import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageMeta } from '../hooks/usePageMeta'

export function NotFound() {
  const { t } = useTranslation()

  usePageMeta({ title: `404 | Link x Link`, path: '/404', noindex: true })

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
