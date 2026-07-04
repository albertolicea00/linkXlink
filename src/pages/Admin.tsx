import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { ThemeToggle } from '../components/ThemeToggle'
import { usePageMeta } from '../hooks/usePageMeta'
import appConfig from '../config/app-config.json'
import { ADMIN_PATH } from '../lib/adminPath'
import type { Profile } from '../types'

export function Admin() {
  const { t } = useTranslation()
  const [session, setSession] = useState<Session | null>(null)

  usePageMeta({ title: `${t('admin.title')} | Link x Link`, path: ADMIN_PATH, noindex: true })

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <div className="page admin-page">
      <header className="admin-page__header">
        <h1>{t('admin.title')}</h1>
        <div className="admin-page__controls">
          <ThemeToggle />
          {session && (
            <button type="button" className="btn" onClick={() => void supabase.auth.signOut()}>
              {t('admin.logout')}
            </button>
          )}
        </div>
      </header>
      <main>{session ? <AdminPanel /> : <LoginForm />}</main>
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error && <p className="form-error">{t('admin.loginError')}</p>}
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {t('admin.login')}
          </button>
        </form>
      </div>
    </div>
  )
}

function StatCard({ value, label, variant }: { value: number; label: string; variant: 'total' | 'pending' | 'active' | 'banned' }) {
  return (
    <div className={`stat-card stat-card--${variant}`}>
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__label">{label}</span>
    </div>
  )
}

function AdminPanel() {
  const { t } = useTranslation()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const loadProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setProfiles((data ?? []) as Profile[])
  }

  useEffect(() => {
    void loadProfiles()
  }, [])

  const pendingProfiles = profiles.filter((p) => !p.active && p.report_count === 0)

  const total = profiles.length
  const pending = pendingProfiles.length
  const active = profiles.filter((p) => p.active).length
  const banned = profiles.filter((p) => !p.active && p.report_count > 0).length

  const siteUrl = appConfig.site_url

  const shareText = `${t('register.shareMessage', { url: siteUrl })}`

  const handleCopy = () => {
    if (!inputRef.current) return
    inputRef.current.select()
    navigator.clipboard?.writeText(inputRef.current.value)
  }

  const handleShareWA = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener')
  }

  const handleShareNative = () => {
    void navigator.share?.({ title: 'Link x Link', text: shareText, url: siteUrl })
  }

  const handleReactivate = async (id: string) => {
    await supabase
      .from('profiles')
      .update({ active: true, report_count: 0, disabled_at: null })
      .eq('id', id)
    await loadProfiles()
  }

  return (
    <div className="admin-panel">
      <div className="admin-stats">
        <StatCard value={total} label={t('admin.statsTotal')} variant="total" />
        <StatCard value={pending} label={t('admin.statsPending')} variant="pending" />
        <StatCard value={active} label={t('admin.statusActive')} variant="active" />
        <StatCard value={banned} label={t('admin.statsBanned')} variant="banned" />
      </div>

      <section className="admin-share">
        <h2>{t('admin.shareTitle')}</h2>
        <p className="admin-share__desc">{t('admin.shareDesc')}</p>
        <div className="admin-share__row">
          <input ref={inputRef} className="admin-share__input" value={siteUrl} readOnly onClick={handleCopy} />
        </div>
        <div className="admin-share__buttons">
          <button type="button" className="btn btn--share btn--share-wa" onClick={handleShareWA}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            WhatsApp
          </button>
          <button type="button" className="btn btn--share btn--share-native" onClick={handleShareNative}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            {t('admin.shareTitle')}
          </button>
        </div>
      </section>

      <section>
        <h2>{t('admin.pendingTitle')}</h2>
        {pendingProfiles.length === 0 ? (
          <p className="form-message">{t('admin.pendingEmpty')}</p>
        ) : (
          <ul className="admin-profile-list">
            {pendingProfiles.map((p) => (
              <li key={p.id} className="admin-profile-row">
                {p.photos[0] && (
                  <img src={p.photos[0]} alt="" className="admin-profile-row__thumb" />
                )}
                <div className="admin-profile-row__info">
                  <span className="admin-profile-row__name">{p.name}</span>
                  <a
                    href={`https://wa.me/${p.whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-profile-row__wa"
                  >
                    +{p.whatsapp}
                  </a>
                  {p.description && (
                    <span className="admin-profile-row__desc">{p.description}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => void handleReactivate(p.id)}
                >
                  {t('admin.approve')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
