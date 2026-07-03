import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { ThemeToggle } from '../components/ThemeToggle'
import { isValidWhatsappNumber, sanitizeWhatsappNumber } from '../lib/whatsapp'
import appConfig from '../config/app-config.json'
import type { Profile } from '../types'

const PHOTOS_BUCKET = 'profile-photos'

export function Admin() {
  const { t } = useTranslation()
  const [session, setSession] = useState<Session | null>(null)

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
  )
}

function AdminPanel() {
  const { t } = useTranslation()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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

  const validate = (): string | null => {
    if (!name.trim()) return t('admin.validationName')
    if (!isValidWhatsappNumber(whatsapp)) return t('admin.validationWhatsapp')
    if (files.length < 1 || files.length > appConfig.max_photos_per_profile)
      return t('admin.validationPhotos')
    return null
  }

  const handleCreate = async (e: React.FormEvent) => {
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

      const { error } = await supabase.from('profiles').insert({
        name: name.trim(),
        description: description.trim(),
        whatsapp: sanitizeWhatsappNumber(whatsapp),
        photos: photoUrls,
      })
      if (error) throw error

      setMessage(t('admin.created'))
      setName('')
      setDescription('')
      setWhatsapp('')
      setFiles([])
      await loadProfiles()
    } catch {
      setMessage(t('admin.createError'))
    } finally {
      setBusy(false)
    }
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
      <section>
        <h2>{t('admin.newProfile')}</h2>
        <form className="admin-form" onSubmit={handleCreate}>
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
          {message && <p className="form-message">{message}</p>}
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {t('admin.create')}
          </button>
        </form>
      </section>

      <section>
        <h2>{t('admin.profilesTitle')}</h2>
        <ul className="admin-profile-list">
          {profiles.map((p) => (
            <li key={p.id} className="admin-profile-row">
              <span className="admin-profile-row__name">{p.name}</span>
              <span
                className={`status status--${p.active ? 'active' : 'disabled'}`}
              >
                {p.active ? t('admin.statusActive') : t('admin.statusDisabled')}
              </span>
              <span className="admin-profile-row__reports">
                {p.report_count} {t('admin.reports')}
              </span>
              {!p.active && (
                <button type="button" className="btn" onClick={() => void handleReactivate(p.id)}>
                  {t('admin.reactivate')}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
