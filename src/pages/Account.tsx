import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from '../components/ThemeToggle'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { ProfileExtraFields } from '../components/ProfileExtraFields'
import { usePageMeta } from '../hooks/usePageMeta'
import { useAuth } from '../hooks/useAuth'
import { fetchOwnProfile } from '../lib/ownProfile'
import { updateOwnProfile } from '../lib/account'
import { ageFromBirthdate } from '../lib/age'
import { supabase } from '../lib/supabase'
import type { Gender, InterestedIn, Profile } from '../types'

type Visibility = 'visible' | 'until' | 'hidden'

export function Account() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loaded, setLoaded] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [interestedIn, setInterestedIn] = useState<InterestedIn | ''>('')
  const [interests, setInterests] = useState<string[]>([])
  const [visibility, setVisibility] = useState<Visibility>('visible')
  const [hiddenUntil, setHiddenUntil] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  usePageMeta({ title: `${t('account.title')} | Link x Link`, path: '/account', noindex: true })

  useEffect(() => {
    if (authLoading) return
    if (!session) {
      void navigate('/app')
      return
    }
    let cancelled = false
    void fetchOwnProfile().then((p) => {
      if (cancelled) return
      setProfile(p)
      setLoaded(true)
      if (p) {
        setName(p.name)
        setDescription(p.description)
        setGender((p.gender as Gender) ?? '')
        setInterestedIn((p.interested_in as InterestedIn) ?? '')
        setInterests(p.interests ?? [])
        if (p.self_hidden) setVisibility('hidden')
        else if (p.hidden_until && new Date(p.hidden_until) > new Date()) {
          setVisibility('until')
          setHiddenUntil(p.hidden_until.slice(0, 10))
        } else setVisibility('visible')
      }
    })
    return () => {
      cancelled = true
    }
  }, [session?.user?.id, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('saving')
    const { error } = await updateOwnProfile({
      name: name.trim(),
      description: description.trim(),
      gender: gender || undefined,
      interested_in: interestedIn || undefined,
      interests,
      self_hidden: visibility === 'hidden',
      hidden_until: visibility === 'until' && hiddenUntil ? new Date(hiddenUntil).toISOString() : null,
      clearHiddenUntil: visibility !== 'until',
    })
    setStatus(error ? 'error' : 'saved')
  }

  const age = ageFromBirthdate(profile?.birthdate)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="page landing account">
      <header className="landing__header">
        <Link to="/app" className="landing__brand">
          {t('app.name')}
        </Link>
        <div className="landing__controls">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="landing__main">
        <h1 className="register__title">{t('account.title')}</h1>

        {(!loaded || authLoading) && <p className="app-page__status">{t('feed.loading')}</p>}

        {loaded && !profile && (
          <div className="register__success">
            <p>{t('account.noProfile')}</p>
            <Link to="/register" className="btn btn--primary">
              {t('gate.createProfile')}
            </Link>
          </div>
        )}

        {loaded && profile && (
          <div className="register__card">
            <div className="register__card-header">
              <span className="register__card-title">{session?.user.email}</span>
              {age !== null && <span className="register__card-subtitle">{t('account.age', { age })}</span>}
            </div>
            <form className="register__form" onSubmit={handleSave}>
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

              <ProfileExtraFields
                gender={gender}
                interestedIn={interestedIn}
                interests={interests}
                onGender={setGender}
                onInterestedIn={setInterestedIn}
                onInterests={setInterests}
              />

              <fieldset className="visibility">
                <legend>{t('account.visibilityTitle')}</legend>
                <label className="radio-row">
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === 'visible'}
                    onChange={() => setVisibility('visible')}
                  />
                  {t('account.visible')}
                </label>
                <label className="radio-row">
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === 'until'}
                    onChange={() => setVisibility('until')}
                  />
                  {t('account.until')}
                </label>
                {visibility === 'until' && (
                  <input
                    type="date"
                    className="visibility__date"
                    value={hiddenUntil}
                    min={today}
                    onChange={(e) => setHiddenUntil(e.target.value)}
                  />
                )}
                <label className="radio-row">
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === 'hidden'}
                    onChange={() => setVisibility('hidden')}
                  />
                  {t('account.hidden')}
                </label>
                <span className="field-help">{t('account.visibilityHelp')}</span>
              </fieldset>

              {status === 'saved' && <p className="form-message">{t('account.saved')}</p>}
              {status === 'error' && <p className="form-error">{t('account.saveError')}</p>}
              <button
                type="submit"
                className="btn btn--primary"
                disabled={status === 'saving' || visibility === 'until' ? !hiddenUntil : false}
              >
                {status === 'saving' ? t('register.submitting') : t('account.save')}
              </button>
            </form>

            <button
              type="button"
              className="auth-panel__toggle"
              onClick={() => void supabase.auth.signOut().then(() => navigate('/app'))}
            >
              {t('admin.logout')}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
