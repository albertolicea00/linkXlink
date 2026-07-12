import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../components/PageHeader'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { ThemeToggle } from '../components/ThemeToggle'
import { EditProfileModal } from '../components/EditProfileModal'
import { EditInterestsModal } from '../components/EditInterestsModal'
import { EditVisibilityModal } from '../components/EditVisibilityModal'
import { CropModal } from '../components/CropModal'
import { TelegramBanner } from '../components/TelegramBanner'
import { WhatsAppBanner } from '../components/WhatsAppBanner'
import { Loader } from '../components/Loader'
import { usePageMeta } from '../hooks/usePageMeta'
import { useAuth } from '../hooks/useAuth'
import { fetchOwnProfile } from '../lib/ownProfile'
import { updateOwnProfile } from '../lib/account'
import { optimizeImage } from '../lib/imageOptimize'
import { isStrongPassword } from '../lib/password'
import { PasswordChecklist } from '../components/PasswordChecklist'
import { SuccessModal } from '../components/SuccessModal'
import { notify } from '../components/Toast'
import { ageFromBirthdate } from '../lib/age'
import { whatsappUrl } from '../lib/whatsapp'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

const PHOTOS_BUCKET = 'profile-photos'

export function Account() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Which edit modal is open — null = none. `?edit=visibility` (from the "you're
  // hidden" banner on /app) opens the visibility modal straight away.
  const [searchParams] = useSearchParams()
  const [modal, setModal] = useState<null | 'profile' | 'interests' | 'visibility'>(
    searchParams.get('edit') === 'visibility' ? 'visibility' : null,
  )
  const [photoStatus, setPhotoStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showPwForm, setShowPwForm] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState(false)
  const [pwDone, setPwDone] = useState(false)
  const [viewPhoto, setViewPhoto] = useState<string | null>(null)
  // File waiting to be cropped before replacing the photo (null = modal closed).
  const [cropFile, setCropFile] = useState<File | null>(null)

  usePageMeta({ title: `${t('account.title')} | Link x Link`, path: '/account', noindex: true })

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
    })
    return () => {
      cancelled = true
    }
  }, [session?.user?.id, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // Merge fields saved by an edit modal into the local profile so the read view
  // updates without a refetch.
  const applyProfilePatch = (fields: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...fields } : prev))
  }

  // Photo replace lives in the photos box (not the edit form): pick a file →
  // optimize + upload + save immediately. Direct swap, no re-moderation for now.
  const handlePhotoReplace = async (file: File) => {
    setPhotoStatus('saving')
    try {
      const optimized = await optimizeImage(file)
      const path = `${crypto.randomUUID()}-${optimized.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const { error: upErr } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, optimized)
      if (upErr) throw upErr
      const url = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl
      const { error } = await updateOwnProfile({ photos: [url] })
      if (error) throw error
      setProfile((prev) => (prev ? { ...prev, photos: [url] } : prev))
      setPhotoStatus('saved')
      notify('success', t('account.saved'))
    } catch {
      setPhotoStatus('error')
      notify('error', t('account.saveError'))
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isStrongPassword(newPw)) return
    setPwBusy(true)
    setPwError(false)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwBusy(false)
    if (error) {
      setPwError(true)
      notify('error', t('account.pwError'))
      return
    }
    setNewPw('')
    setShowPwForm(false)
    setPwDone(true)
    notify('success', t('account.pwDoneTitle'))
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
        <WhatsAppBanner />

        <section className="account-prefs" aria-label={t('account.prefsTitle')}>
          <div className="account-prefs__row">
            <span className="account-prefs__label">{t('account.languageLabel')}</span>
            <LanguageSwitcher full />
          </div>
          <div className="account-prefs__row">
            <span className="account-prefs__label">{t('account.themeLabel')}</span>
            <ThemeToggle variant="segmented" />
          </div>
        </section>

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
                <span className="register__card-title">
                  {t('account.greeting', { email: session?.user.email })}
                </span>
                {/* Contact / social links — WhatsApp first; add Instagram, TikTok,
                    etc. as more rows here when those fields land. */}
                <div className="register__card-socials">
                  {profile.whatsapp && (
                    <a
                      className="register__card-social"
                      href={whatsappUrl(profile.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                        <path d="M12 0a11.94 11.94 0 0 0-10.2 18.16L0 24l5.98-1.57A11.94 11.94 0 1 0 12 0Zm0 21.82a9.86 9.86 0 0 1-5.03-1.38l-.36-.21-3.55.93.95-3.46-.24-.36A9.88 9.88 0 1 1 12 21.82Zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z" />
                      </svg>
                      +{profile.whatsapp}
                    </a>
                  )}
                </div>
              </div>

              <div className="register__form">
                <div className="account-view">
                  <div className="account-view__row">
                    <span className="account-view__label">{t('admin.name')}</span>
                    <span className="account-view__value">{profile.name}</span>
                  </div>
                  {age !== null && (
                    <div className="account-view__row">
                      <span className="account-view__label">{t('account.ageLabel')}</span>
                      <span className="account-view__value">{t('account.age', { age })}</span>
                    </div>
                  )}
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
                </div>

                <button
                  type="button"
                  className="btn btn--small"
                  onClick={() => setModal('profile')}
                >
                  {t('account.edit')}
                </button>
              </div>
          </div>

          <div className="account-side">
          <div className="account-photos">
            <div className="account-photos__header">
              <h3>{t('account.photosTitle')}</h3>
              <label className="btn btn--small account-photos__replace">
                {photoStatus === 'saving' ? t('register.submitting') : t('account.replacePhoto')}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={photoStatus === 'saving'}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setCropFile(file)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
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
            {photoStatus === 'saved' && <p className="form-message">{t('account.saved')}</p>}
            {photoStatus === 'error' && <p className="form-error">{t('account.saveError')}</p>}
          </div>

          <div className="account-interests">
            <div className="account-interests__header">
              <h3>{t('account.interestsLabel')}</h3>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => setModal('interests')}
              >
                {t('account.edit')}
              </button>
            </div>
            {profile.interests && profile.interests.length > 0 ? (
              <div className="interest-chips">
                {profile.interests.map((k) => (
                  <span key={k} className="chip chip--static">
                    {t(`interests.${k}`, k)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="account-photos__empty">{t('account.notSet')}</p>
            )}
          </div>

          <div className="account-visibility">
            <div className="account-visibility__header">
              <h3>{t('account.visibilityTitle')}</h3>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => setModal('visibility')}
              >
                {t('account.edit')}
              </button>
            </div>
            <span className="account-view__status">{visibilityLabel()}</span>
          </div>
          </div>
        </div>
        )}

        <section className="landing__support" style={{ marginTop: '1.7rem', marginBottom: '1rem' }}>
          <h2>{t('landing.supportTitle')}</h2>
          <p>{t('landing.supportText')}</p>
          <a href="https://buymeacoffee.com/albertolicea00" className="btn btn--primary btn--coffee" target="_blank" rel="noopener noreferrer">
            ☕ {t('landing.footerCoffee')}
          </a>
        </section>

        {showPwForm && (
          <form className="register__form account-password__form" onSubmit={handleChangePassword}>
            <label className="field">
              {t('account.newPassword')}
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                autoComplete="new-password"
              />
            </label>
            {newPw.length > 0 && <PasswordChecklist password={newPw} />}
            {pwError && <p className="form-error">{t('account.pwError')}</p>}
            <div className="modal__actions">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setShowPwForm(false)
                  setNewPw('')
                  setPwError(false)
                }}
              >
                {t('account.cancel')}
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={pwBusy || !isStrongPassword(newPw)}
              >
                {pwBusy ? t('register.submitting') : t('account.savePassword')}
              </button>
            </div>
          </form>
        )}

        <div className="account-actions-bottom">
          {!showPwForm && (
            <button type="button" className="btn" onClick={() => setShowPwForm(true)}>
              {t('account.changePassword')}
            </button>
          )}
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
      {pwDone && (
        <SuccessModal
          title={t('account.pwDoneTitle')}
          message={t('account.pwDoneText')}
          onClose={() => setPwDone(false)}
        />
      )}

      {modal === 'profile' && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setModal(null)}
          onSaved={applyProfilePatch}
        />
      )}
      {modal === 'interests' && profile && (
        <EditInterestsModal
          profile={profile}
          onClose={() => setModal(null)}
          onSaved={applyProfilePatch}
        />
      )}
      {cropFile && (
        <CropModal
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onCropped={(f) => {
            setCropFile(null)
            void handlePhotoReplace(f)
          }}
        />
      )}
      {modal === 'visibility' && profile && (
        <EditVisibilityModal
          profile={profile}
          preselectVisible={searchParams.get('edit') === 'visibility'}
          onClose={() => setModal(null)}
          onSaved={applyProfilePatch}
        />
      )}
    </div>
  )
}
