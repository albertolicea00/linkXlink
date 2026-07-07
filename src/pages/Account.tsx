import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../components/PageHeader'
import { ProfileExtraFields } from '../components/ProfileExtraFields'
import { TelegramBanner } from '../components/TelegramBanner'
import { Loader } from '../components/Loader'
import { usePageMeta } from '../hooks/usePageMeta'
import { useAuth } from '../hooks/useAuth'
import { useNav } from '../context/nav'
import { getDevFlags, setDevFlags, type DevFlags } from '../lib/devFlags'
import { fetchOwnProfile } from '../lib/ownProfile'
import { updateOwnProfile } from '../lib/account'
import { optimizeImage } from '../lib/imageOptimize'
import { ageFromBirthdate } from '../lib/age'
import { supabase } from '../lib/supabase'
import type { Gender, InterestedIn, Profile } from '../types'

const PHOTOS_BUCKET = 'profile-photos'

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
  const { role } = useNav()
  const [devFlags, setDevFlagsState] = useState<DevFlags>(getDevFlags)
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
  const [region, setRegion] = useState('')
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [viewPhoto, setViewPhoto] = useState<string | null>(null)

  usePageMeta({ title: `${t('account.title')} | Link x Link`, path: '/account', noindex: true })

  // Populate the editable fields from a profile row (used on load and cancel).
  const hydrate = (p: Profile) => {
    setName(p.name)
    setDescription(p.description)
    setGender((p.gender as Gender) ?? '')
    setInterestedIn((p.interested_in as InterestedIn) ?? '')
    setInterests(p.interests ?? [])
    setRegion(p.region ?? '')
    setNewPhoto(null)
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
    void fetchOwnProfile(session.user.id).then(({ profile }) => {
      if (cancelled) return
      setProfile(profile)
      setLoaded(true)
      if (profile) hydrate(profile)
    })
    return () => {
      cancelled = true
    }
  }, [session?.user?.id, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('saving')

    // Replace photo (direct, no re-moderation for now): optimize + upload, then
    // the RPC swaps profiles.photos to the new URL.
    let newPhotos: string[] | undefined
    if (newPhoto) {
      try {
        const optimized = await optimizeImage(newPhoto)
        const path = `${crypto.randomUUID()}-${optimized.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const { error: upErr } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, optimized)
        if (upErr) throw upErr
        newPhotos = [supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl]
      } catch {
        setStatus('error')
        return
      }
    }

    const patch = {
      name: name.trim(),
      description: description.trim(),
      gender: (gender || undefined) as Gender | undefined,
      interested_in: (interestedIn || undefined) as InterestedIn | undefined,
      interests,
      region: region.trim() || undefined,
      photos: newPhotos,
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
            region: patch.region ?? prev.region,
            photos: newPhotos ?? prev.photos,
            self_hidden: patch.self_hidden,
            hidden_until: patch.hidden_until,
          }
        : prev,
    )
    setNewPhoto(null)
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
          <div className="account-layout">
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
                    <span className="account-view__label">{t('profileFields.region')}</span>
                    <span className="account-view__value">
                      {profile.region || t('account.notSet')}
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
                  className="btn"
                  onClick={() => {
                    setStatus('idle')
                    setEditing(true)
                  }}
                >
                  {t('account.edit')}
                </button>
                {status === 'saved' && <p className="form-message">{t('account.saved')}</p>}

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
                  region={region}
                  onGender={setGender}
                  onInterestedIn={setInterestedIn}
                  onInterests={setInterests}
                  onRegion={setRegion}
                />

                <label className="field">
                  {t('account.replacePhoto')}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewPhoto(e.target.files?.[0] ?? null)}
                  />
                  <span className="field-help">{t('account.replacePhotoHelp')}</span>
                  {newPhoto && (
                    <img
                      src={URL.createObjectURL(newPhoto)}
                      alt=""
                      className="account-photos__thumb"
                    />
                  )}
                </label>

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

          <div className="account-photos">
            <h3>{t('account.photosTitle')}</h3>
            {profile.photos && profile.photos.length > 0 ? (
              <div className="account-photos__list">
                {profile.photos.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="account-photos__thumb"
                    onClick={() => setViewPhoto(url)}
                  />
                ))}
              </div>
            ) : (
              <p className="account-photos__empty">{t('account.notSet')}</p>
            )}
          </div>
        </div>
        )}

        {role === 'admin' && (
          <fieldset className="dev-panel">
            <legend>{t('account.devTitle')}</legend>
            <p className="field-help">{t('account.devHelp')}</p>
            {(
              [
                ['showFakes', 'devShowFakes'],
                ['bypassRelease', 'devBypassRelease'],
                ['onlyMigratedUnclaimed', 'devOnlyMigrated'],
              ] as [keyof DevFlags, string][]
            ).map(([key, label]) => (
              <label key={key} className="dev-panel__item">
                <input
                  type="checkbox"
                  checked={devFlags[key]}
                  onChange={(e) => {
                    const next = { ...devFlags, [key]: e.target.checked }
                    setDevFlags(next)
                    setDevFlagsState(next)
                  }}
                />
                <span>{t(`account.${label}`)}</span>
              </label>
            ))}
            <p className="field-help">{t('account.devReloadHint')}</p>
          </fieldset>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn--secondary auth-panel__toggle"
            onClick={() => void supabase.auth.signOut().then(() => navigate('/app'))}
          >
            {t('admin.logout')}
          </button>
        </div>
      </main>

      {viewPhoto && (
        <div className="photo-viewer" onClick={() => setViewPhoto(null)}>
          <img src={viewPhoto} alt="Full screen" />
        </div>
      )}
    </div>
  )
}
