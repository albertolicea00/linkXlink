import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StatCard } from '../../components/StatCard'
import { SwipeDeck, type SwipeDirection, type SwipeMeta } from '../../components/SwipeDeck'
import { Loader } from '../../components/Loader'
import { ProfileCard } from '../../components/ProfileCard'
import { moderateProfile } from '../../lib/metrics'
import { getSkippedToday, recordSkip } from '../../lib/moderatorSkips'
import { myApprovedCount, myDeniedCount } from '../../lib/moderators'
import { useAdminProfiles } from '../../hooks/useAdminProfiles'
import { DenyReasonModal } from './DenyReasonModal'
import { fireConfetti } from '../../components/Confetti'
import { notify } from '../../components/Toast'
import appConfig from '../../config/app-config.json'
import type { Profile } from '../../types'

export function ModeratorDashboard() {
  const { t } = useTranslation()
  const { setProfiles, modQueue, pending, loadingProfiles } = useAdminProfiles()
  const [approvedByMe, setApprovedByMe] = useState(0)
  const [deniedByMe, setDeniedByMe] = useState(0)
  const [skippedToday, setSkippedToday] = useState(getSkippedToday)
  // Deck feedback: quorum-not-yet-reached toast + the deny-reason picker.
  const [modMessage, setModMessage] = useState<string | null>(null)
  const [denyTarget, setDenyTarget] = useState<{
    profile: Profile
    swipe: (dir: SwipeDirection, meta?: SwipeMeta) => void
  } | null>(null)

  useEffect(() => {
    void myApprovedCount().then(setApprovedByMe)
    void myDeniedCount().then(setDeniedByMe)
  }, [])

  const handleShare = () => {
    const text = t('register.shareMessage', { url: appConfig.site_url })
    if (navigator.share) {
      void navigator.share({ title: 'Link x Link', text, url: appConfig.site_url })
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    }
  }

  // A drag/arrow swipe carries no meta → always a skip. Approve/deny only ever
  // come from the explicit in-card buttons (meta.action), and are quorum-gated
  // server-side: one admin OR N distinct moderators (moderate_profile RPC).
  const handleModeration = async (profile: Profile, _dir: SwipeDirection, meta?: SwipeMeta) => {
    const action = meta?.action ?? 'skip'
    const result = await moderateProfile(profile.id, action, meta?.reason)

    if (action === 'skip') {
      setSkippedToday(recordSkip())
      return
    }
    if (!result) {
      setModMessage(t('admin.moderationError'))
      notify('error', t('admin.moderationError'))
      return
    }

    if (result.applied) {
      if (action === 'approve') {
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === profile.id ? { ...p, active: true, report_count: 0, disabled_at: null } : p,
          ),
        )
        // Server-truth check: if this moderator's fetched count was still 0
        // right before this approval, it's genuinely their first one ever
        // (works across devices, unlike a localStorage flag).
        if (approvedByMe === 0) fireConfetti()
        setApprovedByMe((n) => n + 1)
        setModMessage(t('admin.approvedMsg'))
        notify('success', t('admin.approvedMsg'))
      } else if (result.deleted) {
        // Unclaimed migrated (seed) profile — the RPC deleted the row outright.
        setProfiles((prev) => prev.filter((p) => p.id !== profile.id))
        setDeniedByMe((n) => n + 1)
        setModMessage(t('admin.deniedDeletedMsg'))
        notify('warning', t('admin.deniedDeletedMsg'))
      } else {
        setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, active: false } : p)))
        setDeniedByMe((n) => n + 1)
        setModMessage(t('admin.deniedMsg'))
        notify('warning', t('admin.deniedMsg'))
      }
    } else {
      // Vote recorded, quorum not yet reached.
      const msg = t('admin.voteRecorded', { votes: result.votes, quorum: result.quorum })
      setModMessage(msg)
      notify('info', msg)
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-stats admin-stats--mod">
        <StatCard value={approvedByMe} label={t('admin.statsApprovedByMe')} variant="approved" />
        <StatCard value={pending} label={t('admin.statsPending')} variant="pending" />
        <StatCard value={deniedByMe} label={t('admin.statsDeniedByMe')} variant="banned" />
        <StatCard value={skippedToday} label={t('admin.statsSkippedToday')} variant="total" />
      </div>

      <section className="admin-moderation">
        <h2>{t('admin.pendingTitle')}</h2>
        <p className="field-help">{t('admin.moderationHint')}</p>
        {modMessage && <p className="form-message">{modMessage}</p>}
        <SwipeDeck
          profiles={modQueue}
          // Every swipe is a skip, so both stamps say "skip" and share one
          // neutral color (not red/green, which would imply reject/approve).
          overlayLabels={{ left: t('admin.skip'), right: t('admin.skip') }}
          renderCard={(p, swipe) => {
            const maskPhone = (phone: string) => {
              if (!phone || phone.length < 6) return ''
              return `+${phone.slice(0, 2)} ${phone.slice(2, 4)} xxx ${phone.slice(-2)}`
            }
            const maskedName = `${p.name} (${maskPhone(p.whatsapp)})`

            return (
              <ProfileCard
                profile={{ ...p, name: maskedName }}
                actions={
                  <>
                    <button type="button" className="btn deck-actions__skip" onClick={() => swipe('left')}>
                      {t('admin.skip')}
                    </button>
                    <button
                      type="button"
                      className="btn deck-actions__deny"
                      onClick={() => setDenyTarget({ profile: p, swipe })}
                    >
                      {t('admin.deny')}
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary deck-actions__approve"
                      onClick={() => swipe('right', { action: 'approve' })}
                    >
                      {t('admin.approve')}
                    </button>
                  </>
                }
              />
            )
          }}
          onSwipe={(p, dir, meta) => void handleModeration(p, dir, meta)}
          emptyState={
            loadingProfiles ? (
              <Loader text={t('feed.loading')} />
            ) : (
              <div className="app-page__status">
                <img src="/icons/icon.svg" alt="" className="preview-end__logo" />
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t('admin.pendingEmpty')}</h3>
                <p style={{ maxWidth: '400px', margin: '0 auto 1.25rem', fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                  {t('feed.emptyDesc')}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn--primary" onClick={handleShare}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>
                    {t('feed.shareApp')}
                  </button>
                </div>
              </div>
            )
          }
        />
      </section>
      {denyTarget && (
        <DenyReasonModal
          onCancel={() => setDenyTarget(null)}
          onConfirm={(reason) => {
            denyTarget.swipe('left', { action: 'deny', reason })
            setDenyTarget(null)
          }}
        />
      )}
    </div>
  )
}
