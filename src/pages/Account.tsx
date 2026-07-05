import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../components/PageHeader'
import { ProfileExtraFields } from '../components/ProfileExtraFields'
import { TelegramBanner } from '../components/TelegramBanner'
import { Loader } from '../components/Loader'
import { usePageMeta } from '../hooks/usePageMeta'
import { useAuth } from '../hooks/useAuth'
import { fetchOwnProfile } from '../lib/ownProfile'
import { updateOwnProfile } from '../lib/account'
import { ageFromBirthdate } from '../lib/age'
import { supabase } from '../lib/supabase'
import type { Gender, InterestedIn, Profile } from '../types'

type Visibility = 'visible' | 'until' | 'hidden'

const DURATIONS: { v: string; unit: 'days' | 'weeks' | 'months'; n: number }[] = [
  { v: '3d', unit: 'days', n: 3 },
  { v: '5d', unit: 'days', n: 5 },
  { v: '7d', unit: 'days', n: 7 },
  { v: '2w', unit: 'weeks', n: 2 },
  { v: '3w', unit: 'weeks', n: 3 },
  { v: '4w', unit: 'weeks', n: 4 },
  { v: '2m', unit: 'months', n: 2 },
  { v: '3m', unit: 'months', n: 3 },
  { v: '6m', unit: 'months', n: 6 },
]

/** Frontend computes the target date from a chosen duration (yyyy-mm-dd). */
function computeUntil(v: string): string {
  const o = DURATIONS.find((x) => x.v === v)
  if (!o) return ''
  const d = new Date()
  if (o.unit === 'days') d.setDate(d.getDate() + o.n)
  else if (o.unit === 'weeks') d.setDate(d.getDate() + o.n * 7)
  else d.setMonth(d.getMonth() + o.n)
  return d.toISOString().slice(0, 10)
}

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
  const [duration, setDuration] = useState('')
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  usePageMeta({ title: `${t('account.title')} | Link x Link`, path: '/account', noindex: true })

  // Populate the editable fields from a profile row (used on load and cancel).
  const hydrate = (p: Profile) => {
    setName(p.name)
    setDescription(p.description)
    setGender((p.gender as Gender) ?? '')
    setInterestedIn((p.interested_in as InterestedIn) ?? '')
    setInterests(p.interests ?? [])
    if (p.self_hidden) setVisibility('hidden')
    else if (p.hidden_until && new Date(p.hidden_until) > new Date()) {
      setVisibility('until')
      setHiddenUntil(p.hidden_until.slice(0, 10))
    } else {
      setVisibility('visible')
      setHiddenUntil('')
    }
  }

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
      if (p) hydrate(p)
    })
    return () => {
      cancelled = true
    }
  }, [session?.user?.id, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('saving')
    const patch = {
      name: name.trim(),
      description: description.trim(),
      gender: (gender || undefined) as Gender | undefined,
      interested_in: (interestedIn || undefined) as InterestedIn | undefined,
      interests,
      self_hidden: visibility === 'hidden',
      hidden_until:
        visibility === 'until' && hiddenUntil ? new Date(hiddenUntil).toISOString() : null,
      clearHiddenUntil: visibility !== 'until',
    }
    const { error } = await updateOwnProfile(patch)
    if (error) {
      setStatus('error')
      return
    }
    // Reflect saved values locally so the read view is up to date, then exit.
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            name: patch.name,
            description: patch.description,
            gender: patch.gender ?? null,
            interested_in: patch.interested_in ?? null,
            interests,
            self_hidden: patch.self_hidden,
            hidden_until: patch.hidden_until,
          }
        : prev,
    )
    setStatus('saved')
    setEditing(false)
  }

  const age = ageFromBirthdate(profile?.birthdate)

  const visibilityLabel = () => {
    if (profile?.self_hidden) return t('account.hidden')
    if (profile?.hidden_until && new Date(profile.hidden_until) > new Date())
      return `${t('account.until')} · ${profile.hidden_until.slice(0, 10)}`
    return t('account.visible')
  }

  return (
    <div className="page landing account">
      <PageHeader section={t('nav.account')} />

      <main className="landing__main">
        <TelegramBanner />

        {(!loaded || authLoading) && <Loader text={t('account.loading')} />}

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
              {age !== null && (
                <span className="register__card-subtitle">{t('account.age', { age })}</span>
              )}
            </div>

            {!editing ? (
              <div className="register__form">
                <div className="account-view">
                  <div className="account-view__row">
                    <span className="account-view__label">{t('admin.name')}</span>
                    <span className="account-view__value">{profile.name}</span>
                  </div>
                  <div className="account-view__row">
                    <span className="account-view__label">{t('admin.description')}</span>
                    <span className="account-view__value">
                      {profile.description || t('account.notSet')}
                    </span>
                  </div>
                  <div className="account-view__row">
                    <span className="account-view__label">{t('profileFields.gender')}</span>
                    <span className="account-view__value">
                      {profile.gender ? t(`profileFields.gender_${profile.gender}`) : t('account.notSet')}
                    </span>
                  </div>
                  <div className="account-view__row">
                    <span className="account-view__label">{t('profileFields.interestedIn')}</span>
                    <span className="account-view__value">
                      {profile.interested_in
                        ? t(`profileFields.interested_${profile.interested_in}`)
                        : t('account.notSet')}
                    </span>
                  </div>
                  <div className="account-view__row">
                    <span className="account-view__label">{t('account.interestsLabel')}</span>
                    <span className="account-view__value">
                      {profile.interests && profile.interests.length > 0
                        ? profile.interests.map((k) => t(`interests.${k}`, k)).join(', ')
                        : t('account.notSet')}
                    </span>
                  </div>
                  <div className="account-view__row">
                    <span className="account-view__label">{t('account.visibilityTitle')}</span>
                    <span className="account-view__status">{visibilityLabel()}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => {
                    setStatus('idle')
                    setEditing(true)
                  }}
                >
                  {t('account.edit')}
                </button>
                {status === 'saved' && <p className="form-message">{t('account.saved')}</p>}

                <button
                  type="button"
                  className="btn btn--secondary auth-panel__toggle"
                  onClick={() => void supabase.auth.signOut().then(() => navigate('/app'))}
                >
                  {t('admin.logout')}
                </button>
              </div>
            ) : (
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
                    <div className="visibility__duration">
                      <select
                        value={duration}
                        onChange={(e) => {
                          setDuration(e.target.value)
                          setHiddenUntil(e.target.value ? computeUntil(e.target.value) : '')
                        }}
                      >
                        <option value="" disabled>
                          {t('account.durationChoose')}
                        </option>
                        {DURATIONS.map((d) => (
                          <option key={d.v} value={d.v}>
                            {t(`account.${d.unit}`, { n: d.n })}
                          </option>
                        ))}
                      </select>
                      {hiddenUntil && (
                        <span className="field-help">
                          {t('account.hiddenUntilInfo', { date: hiddenUntil })}
                        </span>
                      )}
                    </div>
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

                {status === 'error' && <p className="form-error">{t('account.saveError')}</p>}
                <div className="account-actions">
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={status === 'saving' || (visibility === 'until' && !hiddenUntil)}
                  >
                    {status === 'saving' ? t('register.submitting') : t('account.save')}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      if (profile) hydrate(profile)
                      setStatus('idle')
                      setEditing(false)
                    }}
                  >
                    {t('account.cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
