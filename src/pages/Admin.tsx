import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { TelegramBanner } from '../components/TelegramBanner'
import { SwipeDeck, type SwipeDirection } from '../components/SwipeDeck'
import { Loader } from '../components/Loader'
import { ProfileCard } from '../components/ProfileCard'
import { usePageMeta } from '../hooks/usePageMeta'
import { useNav } from '../context/nav'
import appConfig from '../config/app-config.json'
import { ADMIN_PATH } from '../lib/adminPath'
import { logModeration } from '../lib/metrics'
import {
  listModerators,
  searchUsers,
  addModerator,
  removeModerator,
  myApprovedCount,
  type Moderator,
  type UserSearchResult,
} from '../lib/moderators'
import type { Profile } from '../types'

export function Admin() {
  const { t } = useTranslation()
  // Role/session come from the shared nav context (fetched once). Regular
  // users share the same Supabase Auth, so a session alone is not enough —
  // the panel only opens for rows in `admins` or `moderators`.
  const { session, role, loading } = useNav()
  // Admins flip between views from the nav bar, which links to
  // ?view=admin / ?view=moderator. Moderators are locked to the moderator view.
  const [searchParams] = useSearchParams()
  const view: 'admin' | 'moderator' = searchParams.get('view') === 'moderator' ? 'moderator' : 'admin'
  const effectiveView = role === 'admin' ? view : 'moderator'

  usePageMeta({ title: `${t('admin.title')} | Link x Link`, path: ADMIN_PATH, noindex: true })

  return (
    <div className="page admin-page">
      <PageHeader
        section={effectiveView === 'moderator' ? t('nav.moderator') : t('nav.admin')}
      />
      <main>
        {!session && !loading && <LoginForm />}
        {session && loading && (
          <p className="app-page__status">{t('admin.checkingAccess')}</p>
        )}
        {session && !loading && role === null && (
          <p className="app-page__status form-error">{t('admin.notAuthorized')}</p>
        )}
        {session && (role === 'admin' || role === 'moderator') && (
          <AdminPanel view={effectiveView} />
        )}
      </main>
    </div>
  )
}

function LogoIcon() {
  return (
    <svg viewBox="0 0 512 512" className="admin-login__logo-icon" aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ec4899" />
          <stop offset="1" stopColor="#fb7185" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#lg)" />
      <path
        d="M256 400 C 214 366 128 300 128 222 C 128 172 166 136 212 136 C 238 136 246 148 256 162 C 266 148 274 136 300 136 C 346 136 384 172 384 222 C 384 300 298 366 256 400 Z"
        fill="#fff"
      />
    </svg>
  )
}

function LoginForm() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(false)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(true)
    setBusy(false)
  }

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <div className="admin-login__brand">
          <LogoIcon />
          <span className="admin-login__app-name">Link x Link</span>
          <p className="admin-login__desc">{t('admin.loginDesc')}</p>
        </div>
        <form className="admin-form" onSubmit={handleSubmit}>
          <label className="field">
            {t('admin.email')}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="field">
            {t('admin.password')}
            <span className="field-password">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="field-password__toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('admin.hidePassword') : t('admin.showPassword')}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </span>
          </label>
          {error && <p className="form-error">{t('admin.loginError')}</p>}
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {t('admin.login')}
          </button>
        </form>
        <p className="admin-login__helper">{t('admin.loginHelper')}</p>
      </div>
    </div>
  )
}

type StatVariant = 'total' | 'pending' | 'active' | 'banned' | 'approved'

function StatCard({ value, label, variant }: { value: number; label: string; variant: StatVariant }) {
  return (
    <div className={`stat-card stat-card--${variant}`}>
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__label">{label}</span>
    </div>
  )
}

function AdminPanel({ view }: { view: 'admin' | 'moderator' }) {
  const { t } = useTranslation()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [approvedByMe, setApprovedByMe] = useState(0)

  // Frozen snapshot for the moderation deck: stats update live, but the deck
  // must keep a stable list so skipped cards don't reappear mid-session.
  const [modQueue, setModQueue] = useState<Profile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)

  const loadProfiles = async () => {
    setLoadingProfiles(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    const list = (data ?? []) as Profile[]
    setProfiles(list)
    setModQueue(list.filter((p) => !p.active && p.report_count === 0))
    setLoadingProfiles(false)
  }

  useEffect(() => {
    void loadProfiles()
    void myApprovedCount().then(setApprovedByMe)
  }, [])

  const total = profiles.length
  const pending = profiles.filter((p) => !p.active && p.report_count === 0).length
  const active = profiles.filter((p) => p.active).length
  const banned = profiles.filter((p) => !p.active && p.report_count > 0).length

  const handleModeration = async (profile: Profile, dir: SwipeDirection) => {
    if (dir === 'right') {
      await supabase
        .from('profiles')
        .update({ active: true, report_count: 0, disabled_at: null })
        .eq('id', profile.id)
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profile.id ? { ...p, active: true, report_count: 0, disabled_at: null } : p,
        ),
      )
      setApprovedByMe((n) => n + 1)
    }
    await logModeration(profile.id, dir === 'right' ? 'approve' : 'skip')
  }

  if (view === 'moderator') {
    return (
      <div className="admin-panel">
        <div className="admin-stats admin-stats--mod">
          <StatCard value={approvedByMe} label={t('admin.statsApprovedByMe')} variant="approved" />
          <StatCard value={pending} label={t('admin.statsPending')} variant="pending" />
        </div>

        <TelegramBanner />
        <ShareApp />

        <section className="admin-moderation">
          <h2>{t('admin.pendingTitle')}</h2>
          <SwipeDeck
            profiles={modQueue}
            overlayLabels={{ left: t('admin.skip'), right: t('admin.approve') }}
            renderCard={(p, swipe) => (
              <ProfileCard
                profile={p}
                actions={
                  <>
                    <button
                      type="button"
                      className="btn deck-actions__skip"
                      onClick={() => swipe('left')}
                    >
                      <span aria-hidden>←</span> {t('admin.skip')}
                    </button>
                    <a
                      href={`https://wa.me/${p.whatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-moderation__wa"
                    >
                      +{p.whatsapp}
                    </a>
                    <button
                      type="button"
                      className="btn btn--primary deck-actions__approve"
                      onClick={() => swipe('right')}
                    >
                      {t('admin.approve')} <span aria-hidden>→</span>
                    </button>
                  </>
                }
              />
            )}
            onSwipe={(p, dir) => void handleModeration(p, dir)}
            emptyState={
              loadingProfiles ? (
                <Loader text={t('feed.loading')} />
              ) : (
                <p className="form-message">{t('admin.pendingEmpty')}</p>
              )
            }
          />
        </section>
      </div>
    )
  }

  // Admin view: global stats (no share, no moderation deck) + moderators mgmt.
  return (
    <div className="admin-panel">
      <div className="admin-stats">
        <StatCard value={total} label={t('admin.statsTotal')} variant="total" />
        <StatCard value={pending} label={t('admin.statsPending')} variant="pending" />
        <StatCard value={active} label={t('admin.statusActive')} variant="active" />
        <StatCard value={banned} label={t('admin.statsBanned')} variant="banned" />
      </div>

      <ModeratorsManager />
    </div>
  )
}

function ShareApp() {
  const { t } = useTranslation()
  const siteUrl = appConfig.site_url
  const shareText = t('register.shareMessage', { url: siteUrl })

  return (
    <section className="admin-share">
      {/* <h2>{t('admin.shareTitle')}</h2> */}
      {/* <p className="admin-share__desc">{t('admin.shareDesc')}</p> */}
      {/* <div className="admin-share__row">
        <input ref={inputRef} className="admin-share__input" value={siteUrl} readOnly onClick={handleCopy} />
      </div> */}
      <div className="admin-share__buttons">
        <button
          type="button"
          className="btn btn--share btn--share-wa"
          onClick={() =>
            window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener')
          }
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
          WhatsApp
        </button>
        <button
          type="button"
          className="btn btn--share btn--share-native"
          onClick={() => void navigator.share?.({ title: 'Link x Link', text: shareText, url: siteUrl })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          {t('admin.shareTitle')}
        </button>
      </div>
    </section>
  )
}

function ModeratorsManager() {
  const { t } = useTranslation()
  const [moderators, setModerators] = useState<Moderator[]>([])
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingMods, setLoadingMods] = useState(true)

  const load = () => {
    setLoadingMods(true)
    void listModerators().then((m) => {
      setModerators(m)
      setLoadingMods(false)
    })
  }

  useEffect(() => {
    load()
  }, [])

  // Debounced search so we don't hit the RPC on every keystroke.
  useEffect(() => {
    const q = term.trim()
    if (!q) {
      setResults([])
      return
    }
    setSearching(true)
    const id = window.setTimeout(() => {
      void searchUsers(q).then((r) => {
        setResults(r)
        setSearching(false)
      })
    }, 350)
    return () => window.clearTimeout(id)
  }, [term])

  const modIds = new Set(moderators.map((m) => m.id))

  const promote = async (u: UserSearchResult) => {
    const { error } = await addModerator(u.id, u.email)
    if (!error) {
      setTerm('')
      setResults([])
      load()
    }
  }

  const demote = async (id: string) => {
    const { error } = await removeModerator(id)
    if (!error) load()
  }

  return (
    <section className="moderators">
      <h2>{t('admin.moderatorsTitle')}</h2>

      <div className="field">
        <label htmlFor="mod-search">{t('admin.moderatorSearch')}</label>
        <input
          id="mod-search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={t('admin.moderatorSearchPlaceholder')}
          autoComplete="off"
        />
        <span className="field-help">{t('admin.moderatorSearchHelp')}</span>
      </div>

      {searching && <p className="form-message">{t('admin.searching')}</p>}
      {results.length > 0 && (
        <ul className="moderators__results">
          {results.map((u) => (
            <li key={u.id}>
              <span>{u.email}</span>
              {modIds.has(u.id) ? (
                <span className="status status--active">{t('admin.alreadyModerator')}</span>
              ) : (
                <button type="button" className="btn btn--primary" onClick={() => void promote(u)}>
                  {t('admin.makeModerator')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3 className="moderators__subtitle">{t('admin.currentModerators')}</h3>
      {loadingMods ? (
        <Loader text={t('feed.loading')} />
      ) : moderators.length === 0 ? (
        <p className="form-message">{t('admin.noModerators')}</p>
      ) : (
        <ul className="moderators__list">
          {moderators.map((m) => (
            <li key={m.id}>
              <span>{m.email}</span>
              <button type="button" className="btn btn--report" onClick={() => void demote(m.id)}>
                {t('admin.removeModerator')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
