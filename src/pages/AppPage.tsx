import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useProfiles } from '../hooks/useProfiles'
import { useSwapCounter } from '../hooks/useSwapCounter'
import { SwipeDeck } from '../components/SwipeDeck'
import { ProfileCard } from '../components/ProfileCard'
import { ReportModal } from '../components/ReportModal'
import { WarningBanner } from '../components/WarningBanner'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { ThemeToggle } from '../components/ThemeToggle'
import { usePageMeta } from '../hooks/usePageMeta'
import { markSeen, orderProfiles } from '../lib/seenProfiles'
import { trackProfileEvent } from '../lib/metrics'
import { getClickCount, recordClick } from '../lib/clickCounter'
import appConfig from '../config/app-config.json'
import type { Profile } from '../types'

export function AppPage() {
  const { t } = useTranslation()
  const { profiles, loading, error, refetch } = useProfiles()
  const { count, swap, limitReached, nearLimit, max } = useSwapCounter()
  const [reporting, setReporting] = useState<Profile | null>(null)
  const [clicks, setClicks] = useState(getClickCount)
  const [searchParams] = useSearchParams()

  // Developer deep link: /app?profile=<uuid> puts that profile on top.
  // Kill switch: deep_link_profiles_enabled in app-config.json.
  const targetId = appConfig.deep_link_profiles_enabled ? searchParams.get('profile') : null

  // Shuffled + least-seen-first, recomputed only when a new list arrives.
  const orderedProfiles = useMemo(() => {
    const ordered = orderProfiles(profiles)
    if (targetId) {
      const i = ordered.findIndex((p) => p.id === targetId)
      if (i > 0) ordered.unshift(...ordered.splice(i, 1))
    }
    return ordered
  }, [profiles, targetId])

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
          <p className="deck-hint">{t('feed.swipeHint')}</p>
        )}
        {!loading && !error && profiles.length > 0 && (
          <SwipeDeck
            profiles={orderedProfiles}
            swipeDisabled={limitReached}
            showCounter={appConfig.show_deck_counter}
            showUndo={appConfig.show_undo_button}
            renderCard={(p) => (
              <ProfileCard
                profile={p}
                whatsappDisabled={limitReached}
                onWhatsappClick={() => {
                  swap()
                  setClicks(recordClick())
                  trackProfileEvent(p.id, 'whatsapp_click')
                }}
                onReportClick={() => setReporting(p)}
              />
            )}
            onSwipe={() => swap()}
            onTopChange={(p) => {
              markSeen(p.id)
              trackProfileEvent(p.id, 'view')
            }}
            emptyState={
              <div className="app-page__status">
                <p>{t('feed.end')}</p>
                <button type="button" className="btn" onClick={() => void refetch()}>
                  {t('feed.restart')}
                </button>
              </div>
            }
          />
        )}

        {!loading && !error && profiles.length > 0 && appConfig.show_deck_stats && (
          <p className="deck-stats">
            <span>{t('feed.statsSwipes', { count, max })}</span>
            <span aria-hidden>·</span>
            <span>{t('feed.statsClicks', { count: clicks })}</span>
          </p>
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
