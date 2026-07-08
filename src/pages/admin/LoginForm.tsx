import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

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

export function LoginForm() {
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
