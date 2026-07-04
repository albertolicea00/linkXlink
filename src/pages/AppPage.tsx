import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useProfiles } from '../hooks/useProfiles'
import { useSwapCounter } from '../hooks/useSwapCounter'
import { SwipeDeck } from '../components/SwipeDeck'
import { ReportModal } from '../components/ReportModal'
import { WarningBanner } from '../components/WarningBanner'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { ThemeToggle } from '../components/ThemeToggle'
import { usePageMeta } from '../hooks/usePageMeta'
import type { Profile } from '../types'

export function AppPage() {
  const { t } = useTranslation()
  const { profiles, loading, error, refetch } = useProfiles()
  const { count, swap, limitReached, nearLimit, max } = useSwapCounter()
  const [reporting, setReporting] = useState<Profile | null>(null)

  usePageMeta({
    title: t('meta.appTitle'),
    description: t('meta.appDescription'),
    path: '/app',
  })

  return (
    <div className="page app-page">
      <h1 className="sr-only">{t('meta.appTitle')}</h1>
      <header className="app-page__header">
        <Link to="/" className="app-page__logo">
          {t('app.name')}
        </Link>
        <div className="app-page__controls">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {limitReached && <WarningBanner variant="error" message={t('swaps.limitReached', { max })} />}
      {nearLimit && <WarningBanner message={t('swaps.warning', { count })} />}

      <main className="app-page__main">
        {loading && <p className="app-page__status">{t('feed.loading')}</p>}

        {!loading && error && (
          <div className="app-page__status">
            <p>{t('feed.error')}</p>
            <button type="button" className="btn" onClick={() => void refetch()}>
              {t('feed.retry')}
            </button>
          </div>
        )}

        {!loading && !error && profiles.length === 0 && (
          <p className="app-page__status">{t('feed.empty')}</p>
        )}

        {!loading && !error && profiles.length > 0 && (
          <SwipeDeck
            profiles={profiles}
            onSwap={swap}
            onWhatsappClick={swap}
            onReportClick={setReporting}
            swapBlocked={limitReached}
            whatsappDisabled={limitReached}
          />
        )}
      </main>

      {reporting && (
        <ReportModal
          profileId={reporting.id}
          onClose={() => setReporting(null)}
          onReported={() => void refetch()}
        />
      )}
    </div>
  )
}
