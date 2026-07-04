import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthPanel } from './AuthPanel'
import { acceptTerms, hasAcceptedTerms } from '../lib/terms'

interface Props {
  /** 'auth' → sign in / sign up; 'profile' → account exists, profile missing. */
  mode: 'auth' | 'profile'
}

/**
 * Soft gate over /app: not a redirect, a friendly blocking overlay.
 * Enforcement toggles: require_auth_for_app / require_profile_for_app.
 */
export function AuthGateModal({ mode }: Props) {
  const { t } = useTranslation()
  const [checked, setChecked] = useState(hasAcceptedTerms)

  const termsOk = checked

  return (
    <div className="modal-backdrop modal-backdrop--gate" role="presentation">
      <div className="modal auth-gate" role="dialog" aria-modal="true" aria-label={t(`gate.${mode}Title`)}>
        <div className="auth-gate__brand">
          <svg viewBox="0 0 512 512" className="auth-gate__logo" aria-hidden>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ec4899" />
                <stop offset="1" stopColor="#fb7185" />
              </linearGradient>
            </defs>
            <rect width="512" height="512" rx="112" fill="url(#g)" />
            <path d="M256 400 C 214 366 128 300 128 222 C 128 172 166 136 212 136 C 238 136 246 148 256 162 C 266 148 274 136 300 136 C 346 136 384 172 384 222 C 384 300 298 366 256 400 Z" fill="#fff" />
          </svg>
          <span className="auth-gate__title">{t('gate.authTitle')}</span>
        </div>
        <p className="auth-gate__text">{t(`gate.${mode}Text`)}</p>
        {mode === 'auth' ? (
          <>
            <AuthPanel termsAccepted={termsOk} />
            <label className="terms-check" style={{ padding: '0.5rem 0 0' }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              <span>
                <Link to="/eula">{t('footer.eula')}</Link>
                {' · '}
                <Link to="/privacy">{t('footer.privacy')}</Link>
                {' · '}
                <Link to="/data">{t('footer.data')}</Link>
              </span>
            </label>
          </>
        ) : (
          <Link to="/register" className="btn btn--primary btn--large auth-gate__cta">
            {t('gate.createProfile')}
          </Link>
        )}
      </div>
    </div>
  )
}
