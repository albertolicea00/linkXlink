import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { isStrongPassword } from '../lib/password'
import { PasswordChecklist } from '../components/PasswordChecklist'
import { SuccessModal } from '../components/SuccessModal'
import { notify } from '../components/Toast'
import { usePageMeta } from '../hooks/usePageMeta'

/**
 * Landing page for the password-recovery email link. Supabase parses the
 * recovery token from the URL and emits a session (PASSWORD_RECOVERY); the user
 * then sets a new password via updateUser. Reached only from the emailed link.
 */
export function ResetPassword() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [done, setDone] = useState(false)

  usePageMeta({ title: `${t('reset.title')} | Link x Link`, path: '/reset-password', noindex: true })

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isStrongPassword(password)) return
    setBusy(true)
    setError(false)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setError(true)
      notify('error', t('reset.error'))
    } else {
      setDone(true)
      notify('success', t('reset.doneTitle'))
    }
  }

  return (
    <div className="page landing">
      <main className="landing__main">
        <div className="register__card" style={{ marginTop: '2rem' }}>
          <h1 style={{ fontSize: '1.4rem', textAlign: 'center' }}>{t('reset.title')}</h1>
          {!ready ? (
            <p className="form-message">{t('reset.openLink')}</p>
          ) : (
            <form className="register__form" onSubmit={handleSubmit}>
              <label className="field">
                {t('reset.newPassword')}
                <span className="field-password">
                  <input
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="field-password__toggle"
                    onClick={() => setShow(!show)}
                    aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')}
                    tabIndex={-1}
                  >
                    {show ? '🙈' : '👁'}
                  </button>
                </span>
              </label>
              {password.length > 0 && <PasswordChecklist password={password} />}
              {error && <p className="form-error">{t('reset.error')}</p>}
              <button
                type="submit"
                className="btn btn--primary"
                disabled={busy || !isStrongPassword(password)}
              >
                {busy ? t('register.submitting') : t('reset.submit')}
              </button>
            </form>
          )}
          <p style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Link to="/app">{t('register.goToApp')}</Link>
          </p>
        </div>
      </main>
      {done && (
        <SuccessModal
          title={t('reset.doneTitle')}
          message={t('reset.doneText')}
          onClose={() => navigate('/app')}
        />
      )}
    </div>
  )
}
