import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNav } from '../context/nav'
import { AuthGateModal } from './AuthGateModal'
import { ADMIN_PATH } from '../lib/adminPath'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useIOSInstallHint } from '../hooks/useIOSInstallHint'
import { IOSInstallHint } from './IOSInstallHint'
import appConfig from '../config/app-config.json'

/**
 * App-like navigation: a fixed bottom bar (mobile) that becomes a top-right
 * cluster on wide screens. Items depend on session + role:
 *   admin      → account, admin, moderator, app
 *   moderator  → account, moderator, app, share
 *   user       → account, app, share
 *   signed out → app, share
 * Not rendered on the landing page (home has its own CTAs).
 */
export function NavBar() {
  const { t } = useTranslation()
  const { session, role, loading } = useNav()
  const { canInstall, promptInstall } = useInstallPrompt()
  const { canInstallIOS, needsSafari, isIPad, autoShow, markSeen } = useIOSInstallHint()
  const { pathname, search } = useLocation()
  // Logged-out visitors still see "Account" — tapping it opens the login/
  // register modal instead of blocking.
  const [authOpen, setAuthOpen] = useState(false)
  const [iosHintOpen, setIosHintOpen] = useState(false)

  // This modal always opens as mode="auth" (only reachable while signed out).
  // Its `mode` prop never updates on its own, so a successful login inside it
  // must close it explicitly — otherwise it keeps showing "Join Link x Link"
  // even after `session` flips true. Any profile-completion gate is handled
  // downstream by the page itself (e.g. AppPage), not here.
  useEffect(() => {
    if (session) setAuthOpen(false)
  }, [session])

  // iOS can't fire a native install prompt, so nudge the manual walkthrough
  // once per device (dismissal persisted in localStorage by the hook).
  useEffect(() => {
    if (autoShow) {
      setIosHintOpen(true)
      markSeen()
    }
  }, [autoShow, markSeen])

  if (loading) return null

  const isAdmin = role === 'admin'
  const isStaff = role === 'admin' || role === 'moderator'

  // Admin and moderator share one route (ADMIN_PATH) and differ only by the
  // ?view= query, so active state can't come from path matching alone.
  const onAdminPath = pathname === ADMIN_PATH
  const viewIsModerator = new URLSearchParams(search).get('view') === 'moderator'
  const cls = (isActive: boolean) => `navbar__item${isActive ? ' active' : ''}`

  const share = () => {
    const text = t('register.shareMessage', { url: appConfig.site_url })
    if (navigator.share) {
      void navigator.share({ title: 'Link x Link', text, url: appConfig.site_url })
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    }
  }

  return (
    <nav className="navbar" aria-label={t('nav.main')}>

      <Link to="/app" className={cls(pathname === '/app')}>
        <Icon.Cards />
        <span>{t('nav.app')}</span>
      </Link>

      {isStaff && (
        <Link to={`${ADMIN_PATH}?view=moderator`} className={cls(onAdminPath && viewIsModerator)}>
          <Icon.Check />
          <span>{t('nav.moderator')}</span>
        </Link>
      )}

      {session ? (
        <Link to="/account" className={cls(pathname === '/account')}>
          <Icon.User />
          <span>{t('nav.account')}</span>
        </Link>
      ) : (
        <button type="button" className="navbar__item" onClick={() => setAuthOpen(true)}>
          <Icon.User />
          <span>{t('nav.login')}</span>
        </button>
      )}
      
      {isAdmin && (
        <Link to={`${ADMIN_PATH}?view=admin`} className={cls(onAdminPath && !viewIsModerator)}>
          <Icon.Shield />
          <span>{t('nav.admin')}</span>
        </Link>
      )}

      {/* {!isAdmin && ( */}
        <button type="button" className="navbar__item" onClick={share}>
          <Icon.Share />
          <span>{t('nav.share')}</span>
        </button>
      {/* )} */}

      {canInstall && (
        <button type="button" className="navbar__item" onClick={() => void promptInstall()}>
          <Icon.Install />
          <span>{t('nav.install')}</span>
        </button>
      )}

      {/* iOS: no native prompt — this button reopens the manual walkthrough. */}
      {!canInstall && (canInstallIOS || needsSafari) && (
        <button type="button" className="navbar__item" onClick={() => setIosHintOpen(true)}>
          <Icon.Install />
          <span>{t('nav.install')}</span>
        </button>
      )}

      {authOpen && <AuthGateModal mode="auth" onClose={() => setAuthOpen(false)} />}
      {iosHintOpen && (
        <IOSInstallHint
          needsSafari={needsSafari}
          isIPad={isIPad}
          onClose={() => setIosHintOpen(false)}
        />
      )}
    </nav>
  )
}

const svg = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  width: 22,
  height: 22,
  'aria-hidden': true,
} as const

const Icon = {
  User: () => (
    <svg {...svg}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  Cards: () => (
    <svg {...svg}>
      <rect x="3" y="5" width="14" height="16" rx="2" />
      <path d="M17 8h2a2 2 0 0 1 2 2v9" />
    </svg>
  ),
  Shield: () => (
    <svg {...svg}>
      <path d="M12 3l7 3v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6z" />
    </svg>
  ),
  Check: () => (
    <svg {...svg}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  Share: () => (
    <svg {...svg}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
      <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
    </svg>
  ),
  Install: () => (
    <svg {...svg}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  ),
}
