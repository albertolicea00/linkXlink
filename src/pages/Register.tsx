import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { ThemeToggle } from '../components/ThemeToggle'
import { usePageMeta } from '../hooks/usePageMeta'
import { supabase } from '../lib/supabase'
import { isValidWhatsappNumber, sanitizeWhatsappNumber } from '../lib/whatsapp'
import { acceptTerms, hasAcceptedTerms } from '../lib/terms'
import { getShareCount, incrementShareCount, REQUIRED_SHARES } from '../lib/registerShares'
import appConfig from '../config/app-config.json'

const PHOTOS_BUCKET = 'profile-photos'

interface Props {
  lang?: 'es' | 'en'
}

export function Register({ lang }: Props) {
  const { t, i18n } = useTranslation()
  const [alreadyAccepted] = useState(hasAcceptedTerms)
  const [checked, setChecked] = useState(false)
  const [shares, setShares] = useState(getShareCount)

  const active = i18n.resolvedLanguage

  useState(() => {
    if (lang && i18n.resolvedLanguage !== lang) {
      void i18n.changeLanguage(lang)
    }
  })
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  usePageMeta({ title: `${t('register.title')} | Link x Link`, path: '/register' })

  const termsOk = alreadyAccepted || checked
  const sharesOk = shares >= REQUIRED_SHARES

  const handleShare = () => {
    const text = t('register.shareMessage', { url: appConfig.site_url })
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    setShares(incrementShareCount())
  }

  const validate = (): string | null => {
    if (!name.trim()) return t('admin.validationName')
    if (!isValidWhatsappNumber(whatsapp)) return t('admin.validationWhatsapp')
    if (files.length < 1 || files.length > appConfig.max_photos_per_profile)
      return t('admin.validationPhotos')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setMessage(validationError)
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const photoUrls: string[] = []
      for (const file of files) {
        const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, file)
        if (error) throw error
        const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path)
        photoUrls.push(data.publicUrl)
      }

      // Self-registered profiles start inactive; RLS rejects public inserts
      // with active = true. An admin activates them from the panel.
      const { error } = await supabase.from('profiles').insert({
        name: name.trim(),
        description: description.trim(),
        whatsapp: sanitizeWhatsappNumber(whatsapp),
        photos: photoUrls,
        active: false,
      })
      if (error) throw error

      if (!alreadyAccepted) acceptTerms()
      setDone(true)
    } catch {
      setMessage(t('register.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page landing register">
      <header className="landing__header">
        <Link to="/" className="landing__brand">
          {t('app.name')}
        </Link>
        <div className="landing__controls">
          <nav className="lang-links" aria-label={t('nav.language')}>
            <Link
              to={lang === 'es' ? '/register' : '/es/register'}
              className={active === 'es' ? 'lang-links--active' : ''}
            >
              ES
            </Link>
            <Link
              to={lang === 'en' ? '/register' : '/en/register'}
              className={active === 'en' ? 'lang-links--active' : ''}
            >
              EN
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className="landing__main">
        <p className="landing__description register__intro">{t('register.intro')}</p>

        {done ? (
          <div className="register__success">
            <p>{t('register.success')}</p>
            <Link to="/app" className="btn btn--primary">
              {t('register.goToApp')}
            </Link>
          </div>
        ) : (
          <>
            <section className="share-gate">
              <h2>{t('register.shareTitle')}</h2>
              <p>{t('register.shareHelp', { count: REQUIRED_SHARES })}</p>
              <button type="button" className="btn btn--whatsapp" onClick={handleShare}>
                {t('register.shareButton')}
              </button>
              <p className="share-gate__progress">
                {t('register.shareProgress', {
                  current: Math.min(shares, REQUIRED_SHARES),
                  total: REQUIRED_SHARES,
                })}
              </p>
            </section>

            <div className="register__card">
              <div className="register__card-header">
                <svg viewBox="0 0 512 512" className="register__card-icon" aria-hidden>
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#ec4899" />
                      <stop offset="1" stopColor="#fb7185" />
                    </linearGradient>
                  </defs>
                  <rect width="512" height="512" rx="112" fill="url(#rg)" />
                  <path
                    d="M256 400 C 214 366 128 300 128 222 C 128 172 166 136 212 136 C 238 136 246 148 256 162 C 266 148 274 136 300 136 C 346 136 384 172 384 222 C 384 300 298 366 256 400 Z"
                    fill="#fff"
                  />
                </svg>
                <span className="register__card-title">{t('register.title')}</span>
              </div>
              <form className="register__form" onSubmit={handleSubmit}>
                <label className="field">
                  {t('admin.name')}
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                </label>
                <label className="field">
                  {t('admin.description')}
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={300}
                    rows={3}
                  />
                </label>
                <label className="field">
                  {t('admin.whatsapp')}
                  <input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label className="field">
                  {t('admin.photos')}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  />
                </label>
                {!alreadyAccepted && (
                  <label className="terms-check">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setChecked(e.target.checked)}
                    />
                    <span>
                      <Trans
                        i18nKey="landing.acceptTerms"
                        components={{
                          eula: <Link to="/eula" />,
                          privacy: <Link to="/privacy" />,
                          data: <Link to="/data" />,
                        }}
                      />
                    </span>
                  </label>
                )}
                {message && <p className="form-error">{message}</p>}
                {!sharesOk && (
                  <p className="form-message">
                    {t('register.shareRequired', { count: REQUIRED_SHARES })}
                  </p>
                )}
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={busy || !termsOk || !sharesOk}
                >
                  {t('register.submit')}
                </button>
              </form>
            </div>
          </>
        )}
      </main>

      <footer className="landing__footer">
        <Link to="/eula">{t('footer.eula')}</Link>
        <Link to="/privacy">{t('footer.privacy')}</Link>
        <Link to="/data">{t('footer.data')}</Link>
      </footer>
    </div>
  )
}
