import { Link, useRouteError } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/**
 * Router-level error boundary (errorElement). Replaces React Router's raw
 * default screen with a branded, friendly fallback + recovery actions.
 */
export function RouteError() {
  const { t } = useTranslation()
  const error = useRouteError()
  // Surface details in the console for debugging; never to the user.
  // eslint-disable-next-line no-console
  console.error('Route error:', error)

  return (
    <div className="page app-page">
      <main className="app-page__main">
        <div className="app-page__status">
          <img src="/icons/icon.svg" alt="" className="preview-end__logo" />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t('routeError.title')}</h3>
          <p style={{ maxWidth: '400px', margin: '0 auto 1.25rem', fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
            {t('routeError.text')}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
              {t('routeError.reload')}
            </button>
            <Link to="/" className="btn">
              {t('routeError.home')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
