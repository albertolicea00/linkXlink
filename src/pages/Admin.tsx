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
  const [copied, setCopied] = useState(false)

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

  const handleCopy = () => {
    if (!inputRef.current) return
    inputRef.current.select()
    navigator.clipboard?.writeText(inputRef.current.value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
          <input ref={inputRef} className="admin-share__input" value={siteUrl} readOnly onClick={(e) => (e.target as HTMLInputElement).select()} />
          <button type="button" className="btn btn--primary" onClick={handleCopy}>
            {copied ? t('admin.shareCopied') : t('admin.shareTitle')}
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
