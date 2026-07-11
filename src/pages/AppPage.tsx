import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useProfiles } from '../hooks/useProfiles'
import { useSwapCounter } from '../hooks/useSwapCounter'
import { useAuth } from '../hooks/useAuth'
import { fetchOwnProfile } from '../lib/ownProfile'
import { fetchPreviewProfiles, removePreviewProfile } from '../lib/previewProfiles'
import { SwipeDeck } from '../components/SwipeDeck'
import { ProfileCard } from '../components/ProfileCard'
import { ReportModal } from '../components/ReportModal'
import { AuthGateModal } from '../components/AuthGateModal'
import { WarningBanner } from '../components/WarningBanner'
import { PageHeader } from '../components/PageHeader'
import { Loader } from '../components/Loader'
import { usePageMeta } from '../hooks/usePageMeta'
import { markSeen, orderProfiles } from '../lib/seenProfiles'
import { trackProfileEvent } from '../lib/metrics'
import { getClickCount, recordClick, isFirstWhatsappClick } from '../lib/clickCounter'
import { fireConfetti } from '../components/Confetti'
import { getDevFlags } from '../lib/devFlags'
import appConfig from '../config/app-config.json'
import type { Profile } from '../types'

export function AppPage() {
  const { t } = useTranslation()
  const { profiles, loading, error, servingCached, refetch } = useProfiles()
  const { count, swap } = useSwapCounter()
  const [reporting, setReporting] = useState<Profile | null>(null)
  const [clicks, setClicks] = useState(getClickCount)
  // Dev flag lets admins ignore the soft daily WhatsApp-click limit while testing.
  const bypassLimits = getDevFlags().bypassLimits
  const clickLimitReached = !bypassLimits && clicks >= appConfig.max_swaps_per_24h
  const clickNearLimit = !bypassLimits && !clickLimitReached && clicks >= appConfig.warning_swap_threshold
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
    // Right after login the auth token may not have propagated to PostgREST
    // yet, so the first read can come back empty (no error) even though a
    // profile exists — which would briefly flash the "create your profile"
    // gate. Treat an empty first result as unsettled and retry once before
    // trusting it; never mark ownChecked on an errored read (fail open).
    const check = async () => {
      const first = await fetchOwnProfile(session.user.id)
      if (cancelled) return
      if (first.error) return
      if (first.profile) {
        setOwnProfile(first.profile)
        setOwnChecked(true)
        return
      }
      await new Promise((r) => setTimeout(r, 700))
      if (cancelled) return
      const second = await fetchOwnProfile(session.user.id)
      if (cancelled || second.error) return
      setOwnProfile(second.profile)
      setOwnChecked(true)
    }
    void check()
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

  const handleShare = () => {
    const text = t('register.shareMessage', { url: appConfig.site_url })
    if (navigator.share) {
      void navigator.share({ title: 'Link x Link', text, url: appConfig.site_url })
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    }
  }

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
  // Only ever show while actually blocked, so signing in (blocked flips false)
  // hides it the SAME render — no leftover `gateOpen` flashing the modal after
  // auth. `gateOpen` is the preview "tap to unlock" trigger; `!previewEnabled`
  // is the hard gate with no preview.
  const showGate = blocked && (gateOpen || !previewEnabled)

  return (
    <div className="page app-page">
      <PageHeader section={t('nav.app')} />

      {clickLimitReached && (
        <WarningBanner
          variant="error"
          message={t('swaps.limitReached', { max: appConfig.max_swaps_per_24h })}
        />
      )}
      {clickNearLimit && <WarningBanner message={t('swaps.warning', { count: clicks })} />}
      {previewMode && <WarningBanner variant="info" message={t('feed.previewBanner')} />}

      {/* Own profile paused/hidden → nudge to re-appear (links to account). */}
      {!previewMode &&
        ownProfile &&
        (ownProfile.self_hidden ||
          (ownProfile.hidden_until && new Date(ownProfile.hidden_until) > new Date())) && (
          <Link to="/account?edit=visibility" className="paused-banner">
            {ownProfile.self_hidden
              ? t('feed.pausedHidden')
              : t('feed.pausedUntil', { date: ownProfile.hidden_until!.slice(0, 10) })}
          </Link>
        )}

      <main className="app-page__main">
        {isLoading && <Loader text={t('feed.loading')} />}

        {!isLoading && !previewMode && servingCached && deckProfiles.length > 0 && (
          <p className="app-page__status" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {t('app.offline')}
          </p>
        )}

        {!isLoading && !previewMode && error && (
          <div className="app-page__status">
            <p>{t('feed.error')}</p>
            <button type="button" className="btn" onClick={() => void refetch()}>
              {t('feed.retry')}
            </button>
          </div>
        )}

        {!isLoading && deckProfiles.length === 0 && !(blocked && !previewEnabled) && (
          <div className="app-page__status">
            <img src="/icons/icon.svg" alt="" className="preview-end__logo" />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t('feed.empty')}</h3>
            <p style={{ maxWidth: '400px', margin: '0 auto 1.25rem', fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
              {t('feed.emptyDesc')}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn--primary" onClick={handleShare}>
                {t('feed.shareApp')}
              </button>
              {!ownProfile && (
                <Link to="/register" className="btn">
                  {t('gate.createProfile')}
                </Link>
              )}
            </div>
          </div>
        )}

        {!isLoading && deckProfiles.length > 0 && (
          <>
            <SwipeDeck
              profiles={deckProfiles}
              hint={<p className="deck-hint">{t('feed.swipeHint')}</p>}
              showCounter={appConfig.show_deck_counter}
              showUndo={!previewMode && appConfig.show_undo_button}
              renderCard={(p) => (
                <ProfileCard
                  profile={p}
                  whatsappDisabled={clickLimitReached}
                  onWhatsappClick={(e) => {
                    if (previewMode) {
                      e.preventDefault()
                      setGateOpen(true)
                      return
                    }
                    setClicks(recordClick())
                    trackProfileEvent(p.id, 'whatsapp_click')
                    if (isFirstWhatsappClick()) fireConfetti()
                  }}
                  onReportClick={() => (previewMode ? setGateOpen(true) : setReporting(p))}
                />
              )}
              onSwipe={() => !previewMode && swap()}
              onTopChange={(p) => {
                if (previewMode) {
                  removePreviewProfile(p.id)
                  return
                }
                markSeen(p.id)
                trackProfileEvent(p.id, 'view')
              }}
              emptyState={
                previewMode ? (
                  <div className="app-page__status">
                    <img src="/icons/icon.svg" alt="" className="preview-end__logo" />
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
                    <img src="/icons/icon.svg" alt="" className="preview-end__logo" />
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t('feed.end')}</h3>
                    <p style={{ maxWidth: '400px', margin: '0 auto 1.25rem', fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                      {t('feed.emptyDesc')}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button type="button" className="btn btn--primary" onClick={handleShare}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>
                        {t('feed.shareApp')}
                      </button>
                      <button type="button" className="btn" onClick={() => void refetch()}>
                        {t('feed.restart')}
                      </button>
                    </div>
                  </div>
                )
              }
            />
          </>
        )}

        {!isLoading && !previewMode && deckProfiles.length > 0 && appConfig.show_deck_stats && (
          <p className="deck-stats">
            <span>{t('feed.statsSwipes', { count })}</span>
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
