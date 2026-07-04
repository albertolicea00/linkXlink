import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import appConfig from '../config/app-config.json'

export type OAuthProvider = 'google' | 'apple' | 'facebook'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.46 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.35.6 4.6 1.8l3.44-3.45A11.98 11.98 0 0 0 1.27 6.61l4.01 3.1C6.22 6.87 8.87 4.76 12 4.76Z"
      />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M16.36 12.79c.03 3.26 2.86 4.35 2.9 4.36-.03.08-.46 1.56-1.5 3.1-.9 1.32-1.84 2.64-3.32 2.66-1.45.03-1.92-.86-3.58-.86-1.66 0-2.18.84-3.55.89-1.42.05-2.51-1.43-3.42-2.75-1.86-2.68-3.28-7.58-1.37-10.88a5.31 5.31 0 0 1 4.47-2.72c1.4-.03 2.72.94 3.58.94.85 0 2.46-1.16 4.15-.99.71.03 2.69.29 3.96 2.15-.1.06-2.36 1.38-2.32 4.1ZM13.64 4.9c.76-.92 1.27-2.19 1.13-3.46-1.09.04-2.41.73-3.19 1.64-.7.81-1.32 2.11-1.15 3.35 1.22.1 2.45-.62 3.21-1.53Z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="#1877F2" aria-hidden>
      <path d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95H15.8c-1.49 0-1.95.93-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12Z" />
    </svg>
  )
}

const ICONS: Record<OAuthProvider, () => React.JSX.Element> = {
  google: GoogleIcon,
  apple: AppleIcon,
  facebook: FacebookIcon,
}

const NAMES: Record<OAuthProvider, string> = {
  google: 'Google',
  apple: 'Apple',
  facebook: 'Facebook',
}

/**
 * OAuth sign-in buttons for the providers listed in app-config
 * (`auth_providers`). Redirects back to the current page, where the
 * session is picked up automatically. Shared by user auth (register /
 * app gate) and the admin login — whether the resulting account has
 * admin rights is decided by the `admins` table, never by the provider.
 */
export function OAuthButtons() {
  const { t } = useTranslation()
  const providers = appConfig.auth_providers as OAuthProvider[]

  if (providers.length === 0) return null

  const handleOAuth = (provider: OAuthProvider) => {
    void supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + window.location.pathname },
    })
  }

  return (
    <div className="auth-panel__providers">
      {providers.map((p) => {
        const Icon = ICONS[p]
        return (
          <button
            key={p}
            type="button"
            className="btn auth-panel__provider"
            onClick={() => handleOAuth(p)}
          >
            <Icon />
            {t('auth.continueWith', { provider: NAMES[p] })}
          </button>
        )
      })}
    </div>
  )
}
