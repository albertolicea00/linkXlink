import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useProfiles } from '../hooks/useProfiles'
import { useSwapCounter } from '../hooks/useSwapCounter'
import { useAuth } from '../hooks/useAuth'
import { fetchOwnProfile } from '../lib/ownProfile'
import { fetchPreviewProfiles } from '../lib/previewProfiles'
import { SwipeDeck } from '../components/SwipeDeck'
import { ProfileCard } from '../components/ProfileCard'
import { ReportModal } from '../components/ReportModal'
import { AuthGateModal } from '../components/AuthGateModal'
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
  const { count, swap } = useSwapCounter()
  const [reporting, setReporting] = useState<Profile | null>(null)
  const [clicks, setClicks] = useState(getClickCount)
  const clickLimitReached = clicks >= appConfig.max_swaps_per_24h
  const clickNearLimit = !clickLimitReached && clicks >= appConfig.warning_swap_threshold
  const [searchParams] = useSearchParams()

  const { session, loading: authLoading } = useAuth()
  const [ownProfile, setOwnProfile] = useState<Profile | null>(null)
  const [ownChecked, setOwnChecked] = useState(false)

  useEffect(() => {
    if (!session) {
      setOwnProfile(null)
      setOwnChecked(false)
      return
    }
    let cancelled = false
    void fetchOwnProfile().then((p) => {
      if (!cancelled) {
        setOwnProfile(p)
        setOwnChecked(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // RLS ties the feed to the session; the initial fetch may fire before
  // Supabase restores it from storage, so refetch once auth resolves.
  useEffect(() => {
    if (session) void refetch()
  }, [session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Who is blocked from the full feed, and how to invite them in.
  const needsAuth = appConfig.require_auth_for_app && !authLoading && !session
  const needsProfile =
    appConfig.require_profile_for_app && !!session && ownChecked && !ownProfile
  const blocked = needsAuth || needsProfile
  const gateMode: 'auth' | 'profile' = session ? 'profile' : 'auth'

  // Preview: signed-out / profile-less visitors get a teaser of N profiles
  // (whatsapp disabled) instead of an immediate wall. Set preview_profiles_count
  // to 0 to gate instantly.
  const previewEnabled = appConfig.preview_profiles_count > 0
  const previewMode = blocked && previewEnabled
  const [preview, setPreview] = useState<Profile[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [gateOpen, setGateOpen] = useState(false)

  useEffect(() => {
    if (!previewMode) return
    let cancelled = false
    setPreviewLoading(true)
    void fetchPreviewProfiles().then((list) => {
      if (!cancelled) {
        setPreview(list)
        setPreviewLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [previewMode])

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

  // Gate the instant a blocked visitor has no preview to show.
  const isLoading = previewMode ? previewLoading : loading
  const deckProfiles = previewMode ? preview : orderedProfiles
  const showGate = gateOpen || (blocked && !previewEnabled)

  return (
    <div className="page app-page">
      <h1 className="sr-only">{t('meta.appTitle')}</h1>
      <header className="app-page__header">
        <Link to="/" className="app-page__logo">
          {t('app.name')}
        </Link>
        <div className="app-page__controls">
          {session && (
            <Link to="/account" className="btn app-page__account" aria-label={t('account.title')}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </Link>
          )}
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {clickLimitReached && (
        <WarningBanner
          variant="error"
          message={t('swaps.limitReached', { max: appConfig.max_swaps_per_24h })}
        />
      )}
      {clickNearLimit && <WarningBanner message={t('swaps.warning', { count: clicks })} />}
      {previewMode && <WarningBanner variant="info" message={t('feed.previewBanner')} />}

      <main className="app-page__main">
        {isLoading && <p className="app-page__status">{t('feed.loading')}</p>}

        {!isLoading && !previewMode && error && (
          <div className="app-page__status">
            <p>{t('feed.error')}</p>
            <button type="button" className="btn" onClick={() => void refetch()}>
              {t('feed.retry')}
            </button>
          </div>
        )}

        {!isLoading && deckProfiles.length === 0 && !(blocked && !previewEnabled) && (
          <p className="app-page__status">{t('feed.empty')}</p>
        )}

        {!isLoading && deckProfiles.length > 0 && (
          <>
            <p className="deck-hint">{t('feed.swipeHint')}</p>
            <SwipeDeck
              profiles={deckProfiles}
              showCounter={appConfig.show_deck_counter}
              showUndo={!previewMode && appConfig.show_undo_button}
              renderCard={(p) => (
                <ProfileCard
                  profile={p}
                  whatsappDisabled={previewMode || clickLimitReached}
                  onWhatsappClick={() => {
                    if (previewMode) {
                      setGateOpen(true)
                      return
                    }
                    setClicks(recordClick())
                    trackProfileEvent(p.id, 'whatsapp_click')
                  }}
                  onReportClick={() => (previewMode ? setGateOpen(true) : setReporting(p))}
                />
              )}
              onSwipe={() => !previewMode && swap()}
              onTopChange={(p) => {
                if (previewMode) return
                markSeen(p.id)
                trackProfileEvent(p.id, 'view')
              }}
              emptyState={
                previewMode ? (
                  <div className="app-page__status">
                    <p>{t('feed.previewEnd')}</p>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => setGateOpen(true)}
                    >
                      {t(gateMode === 'auth' ? 'gate.authCta' : 'gate.createProfile')}
                    </button>
                  </div>
                ) : (
                  <div className="app-page__status">
                    <p>{t('feed.end')}</p>
                    <button type="button" className="btn" onClick={() => void refetch()}>
                      {t('feed.restart')}
                    </button>
                  </div>
                )
              }
            />
          </>
        )}

        {!isLoading && !previewMode && deckProfiles.length > 0 && appConfig.show_deck_stats && (
          <p className="deck-stats">
            <span>{t('feed.statsSwipes', { count, max: appConfig.max_swaps_per_24h })}</span>
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

      {showGate && <AuthGateModal mode={gateMode} onClose={previewEnabled ? () => setGateOpen(false) : undefined} />}
    </div>
  )
}
