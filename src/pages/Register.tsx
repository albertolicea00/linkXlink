import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import {
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from 'libphonenumber-js/max'
import { ThemeToggle } from '../components/ThemeToggle'
import { PhoneInput } from '../components/PhoneInput'
import { AuthPanel } from '../components/AuthPanel'
import { ProfileExtraFields } from '../components/ProfileExtraFields'
import { usePageMeta } from '../hooks/usePageMeta'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { optimizeImage } from '../lib/imageOptimize'
import { acceptTerms, hasAcceptedTerms } from '../lib/terms'
import { fetchOwnProfile } from '../lib/ownProfile'
import { getShareCount, incrementShareCount, REQUIRED_SHARES } from '../lib/registerShares'
import { fireConfetti } from '../components/Confetti'
import { notify } from '../components/Toast'
import appConfig from '../config/app-config.json'
import type { Gender, InterestedIn, Profile } from '../types'

const PHOTOS_BUCKET = 'profile-photos'
const DEFAULT_COUNTRY: CountryCode = 'CU'
const MAX_PHOTO_BYTES = appConfig.max_photo_upload_mb * 1024 * 1024

/** Latest birthdate that still makes the person 18 today (ISO yyyy-mm-dd). */
function maxBirthdate(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 18)
  return d.toISOString().slice(0, 10)
}

type FieldName = 'name' | 'birthdate' | 'phone' | 'photos' | 'gender'
type Step = 1 | 2 | 3

interface Props {
  lang?: 'es' | 'en'
}

export function Register({ lang }: Props) {
  const { t, i18n } = useTranslation()
  const { session, loading: authLoading } = useAuth()
  const [ownProfile, setOwnProfile] = useState<Profile | null>(null)
  const [ownChecked, setOwnChecked] = useState(false)
  const [alreadyAccepted] = useState(hasAcceptedTerms)
  const [checked, setChecked] = useState(false)
  const [shares, setShares] = useState(getShareCount)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY)
  const [national, setNational] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [interestedIn, setInterestedIn] = useState<InterestedIn | ''>('')
  const [interests, setInterests] = useState<string[]>([])
  const [region, setRegion] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  // When the number is already owned by someone else, offer an ownership claim.
  const [duplicateWhatsapp, setDuplicateWhatsapp] = useState<string | null>(null)
  const [ownershipFiled, setOwnershipFiled] = useState(false)

  const active = i18n.resolvedLanguage

  useEffect(() => {
    if (lang && i18n.resolvedLanguage !== lang) {
      void i18n.changeLanguage(lang)
    }
  }, [lang, i18n])

  useEffect(() => {
    if (!session) {
      setOwnProfile(null)
      setOwnChecked(false)
      return
    }
    let cancelled = false
    void fetchOwnProfile(session.user.id).then(({ profile }) => {
      if (!cancelled) {
        setOwnProfile(profile)
        setOwnChecked(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  usePageMeta({
    title: `${t('register.title')} | Link x Link`,
    path: lang ? `/${lang}/register` : '/register',
  })

  const termsOk = alreadyAccepted || checked
  const sharesOk = shares >= REQUIRED_SHARES
  const step: Step = !session ? 1 : !sharesOk ? 2 : 3

  const touch = (field: FieldName) => setTouched((s) => ({ ...s, [field]: true }))

  const phoneError = (): string | null => {
    if (!national) return t('register.phoneRequired')
    const length = validatePhoneNumberLength(national, country)
    if (length === 'TOO_SHORT') return t('register.phoneTooShort')
    if (length === 'TOO_LONG') return t('register.phoneTooLong')
    if (length) return t('register.phoneInvalid')
    const phone = parsePhoneNumberFromString(national, country)
    if (!phone || !phone.isValid()) return t('register.phoneInvalid')
    return null
  }

  const photosError = (): string | null => {
    if (files.length < 1 || files.length > appConfig.max_photos_per_profile)
      return t('register.validationPhotos', { max: appConfig.max_photos_per_profile })
    if (files.some((f) => !f.type.startsWith('image/'))) return t('register.validationPhotoType')
    if (files.some((f) => f.size > MAX_PHOTO_BYTES))
      return t('register.validationPhotoSize', { mb: appConfig.max_photo_upload_mb })
    return null
  }

  const errors: Record<FieldName, string | null> = {
    name: name.trim() ? null : t('admin.validationName'),
    birthdate: birthdate && birthdate <= maxBirthdate() ? null : t('register.validationAge'),
    gender: gender ? null : t('register.validationGender'),
    phone: phoneError(),
    photos: photosError(),
  }
  const hasErrors = Object.values(errors).some(Boolean)
  const fieldError = (field: FieldName) => (touched[field] ? errors[field] : null)

  const handleNationalChange = (value: string) => {
    // Refuse digits beyond the longest valid number for the chosen country.
    if (value.length > national.length && validatePhoneNumberLength(value, country) === 'TOO_LONG')
      return
    setNational(value)
  }

  const handleShare = () => {
    const text = t('register.shareMessage', { url: appConfig.site_url })
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    setShares(incrementShareCount())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    setTouched({ name: true, birthdate: true, phone: true, photos: true, gender: true })
    if (hasErrors) return
    setBusy(true)
    setMessage(null)
    setDuplicateWhatsapp(null)
    try {
      const photoUrls: string[] = []
      for (const file of files) {
        const optimized = await optimizeImage(file)
        const path = `${crypto.randomUUID()}-${optimized.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, optimized)
        if (error) throw error
        const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path)
        photoUrls.push(data.publicUrl)
      }

      // E.164 without the "+": digits-only with country code, as the DB expects.
      const whatsapp = parsePhoneNumberFromString(national, country)!.number.slice(1)

      // Owned by the signed-in user, always pending; RLS enforces both.
      // Birthdate is stored to show age; the feed is member-gated (0006) and
      // the UI never renders the raw date to other users, only the age.
      const { error } = await supabase.from('profiles').insert({
        name: name.trim(),
        description: description.trim(),
        whatsapp,
        photos: photoUrls,
        active: false,
        owner_id: session.user.id,
        birthdate,
        gender: gender || null,
        interested_in: interestedIn || null,
        interests,
        region: region.trim() || null,
      })

      if (error) {
        // Number already registered. If it belongs to a claimable seed row
        // (migrated, ownerless), take it over instead of erroring.
        if (error.code === '23505') {
          const { data: claim } = await supabase.rpc('claim_migrated_profile', {
            p_whatsapp: whatsapp,
            p_name: name.trim(),
            p_description: description.trim(),
            p_photos: photoUrls,
            p_birthdate: birthdate,
            p_gender: gender || null,
            p_interested_in: interestedIn || null,
            p_interests: interests,
            p_region: region.trim() || null,
          })
          if (claim?.claimed) {
            if (!alreadyAccepted) acceptTerms()
            setDone(true)
            fireConfetti()
            notify('success', t('register.success'))
            return
          }
          // Owned by someone else — offer the "it's mine" ownership claim.
          setDuplicateWhatsapp(whatsapp)
          setMessage(t('register.duplicate'))
          return
        }
        throw error
      }

      if (!alreadyAccepted) acceptTerms()
      setDone(true)
      fireConfetti()
      notify('success', t('register.success'))
    } catch {
      setMessage(t('register.error'))
      notify('error', t('register.error'))
    } finally {
      setBusy(false)
    }
  }

  const handleOwnershipClaim = async () => {
    if (!duplicateWhatsapp) return
    setBusy(true)
    const { data } = await supabase.rpc('claim_ownership', {
      p_whatsapp: duplicateWhatsapp,
      p_note: null,
    })
    setBusy(false)
    if ((data as { filed?: boolean } | null)?.filed) setOwnershipFiled(true)
  }

  const steps: { n: Step; label: string }[] = [
    { n: 1, label: t('register.stepAccount') },
    { n: 2, label: t('register.stepShare') },
    { n: 3, label: t('register.stepProfile') },
  ]

  const showWizard = !done && !ownProfile && !authLoading && (step === 1 || !session || ownChecked)

  return (
    <div className="page landing register">
      <header className="landing__header">
        <Link to="/" className="landing__brand">
          {t('app.name')}
        </Link>
        <div className="landing__controls">
          <nav className="lang-links" aria-label={t('nav.language')}>
            <Link to="/es/register" className={active === 'es' ? 'lang-links--active' : ''}>
              ES
            </Link>
            <Link to="/en/register" className={active === 'en' ? 'lang-links--active' : ''}>
              EN
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className="landing__main">
        <p className="landing__description register__intro">{t('register.intro')}</p>

        {done && (
          <div className="register__success">
            <p>{t('register.success')}</p>
            <Link to="/app" className="btn btn--primary">
              {t('register.goToApp')}
            </Link>
          </div>
        )}

        {!done && ownProfile && (
          <div className="register__success">
            <p>
              {ownProfile.active
                ? t('register.alreadyActive')
                : t('register.alreadyPending')}
            </p>
            <Link to="/app" className="btn btn--primary">
              {t('register.goToApp')}
            </Link>
          </div>
        )}

        {showWizard && (
          <>
            <ol className="steps" aria-label={t('register.title')}>
              {steps.map((s) => (
                <li
                  key={s.n}
                  className={`steps__item${step === s.n ? ' steps__item--active' : ''}${
                    step > s.n ? ' steps__item--done' : ''
                  }`}
                  aria-current={step === s.n ? 'step' : undefined}
                >
                  <span className="steps__num">{step > s.n ? '✓' : s.n}</span>
                  {s.label}
                </li>
              ))}
            </ol>

            {session && (
              <p className="register__account">
                {session.user.email}
                {' · '}
                <button type="button" onClick={() => void supabase.auth.signOut()}>
                  {t('admin.logout')}
                </button>
              </p>
            )}

            {step === 1 && (
              <div className="register__card">
                <div className="register__card-header">
                  <RegisterLogo />
                  <span className="register__card-title">{t('gate.authTitle')}</span>
                  <span className="register__card-subtitle">{t('register.stepAccountTitle')}</span>
                </div>
                <AuthPanel />
              </div>
            )}

            {step === 2 && (
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
            )}

            {step === 3 && (
              <div className="register__card">
                <div className="register__card-header">
                  <RegisterLogo />
                  <span className="register__card-title">{t('gate.authTitle')}</span>
                  <span className="register__card-subtitle">{t('register.title')}</span>
                </div>
                <form className="register__form" onSubmit={handleSubmit} noValidate>
                  <label className="field">
                    {t('admin.name')}
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => touch('name')}
                      maxLength={80}
                    />
                    <span className="field-help">{t('register.nameHelp')}</span>
                    {fieldError('name') && (
                      <span className="field-error">{fieldError('name')}</span>
                    )}
                  </label>
                  <label className="field">
                    {t('admin.description')}
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={300}
                      rows={3}
                    />
                    <span className="field-help">{t('register.descriptionHelp')}</span>
                  </label>
                  <label className="field">
                    {t('register.birthdate')}
                    <input
                      type="date"
                      value={birthdate}
                      max={maxBirthdate()}
                      onChange={(e) => {
                        setBirthdate(e.target.value)
                        touch('birthdate')
                      }}
                      onBlur={() => touch('birthdate')}
                      required
                    />
                    <span className="field-help">{t('register.birthdateHelp')}</span>
                    {fieldError('birthdate') && (
                      <span className="field-error">{fieldError('birthdate')}</span>
                    )}
                  </label>
                  <ProfileExtraFields
                    gender={gender}
                    interestedIn={interestedIn}
                    interests={interests}
                    onGender={(g) => {
                      setGender(g)
                      touch('gender')
                    }}
                    onInterestedIn={setInterestedIn}
                    onInterests={setInterests}
                    region={region}
                    onRegion={setRegion}
                  />
                  {fieldError('gender') && (
                    <span className="field-error">{fieldError('gender')}</span>
                  )}
                  <div className="field">
                    <span>{t('register.whatsapp')}</span>
                    <PhoneInput
                      country={country}
                      national={national}
                      onCountryChange={(c) => {
                        setCountry(c)
                        if (national) touch('phone')
                      }}
                      onNationalChange={(v) => {
                        handleNationalChange(v)
                        touch('phone')
                      }}
                      onBlur={() => touch('phone')}
                    />
                    <span className="field-help">{t('register.whatsappHelp')}</span>
                    {fieldError('phone') && (
                      <span className="field-error">{fieldError('phone')}</span>
                    )}
                  </div>
                  <label className="field">
                    {t('register.photos', { max: appConfig.max_photos_per_profile })}
                    <input
                      type="file"
                      accept="image/*"
                      multiple={appConfig.max_photos_per_profile > 1}
                      onChange={(e) => {
                        setFiles(Array.from(e.target.files ?? []))
                        touch('photos')
                      }}
                    />
                    <span className="field-help">{t('register.photosHelp')}</span>
                    {fieldError('photos') && (
                      <span className="field-error">{fieldError('photos')}</span>
                    )}
                  </label>
                  <label className="terms-check">
                    <input
                      type="checkbox"
                      checked={alreadyAccepted || checked}
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
                  {message && <p className="form-error">{message}</p>}
                  {duplicateWhatsapp && !ownershipFiled && (
                    <div className="register__ownership">
                      <p className="field-help">{t('register.ownershipPrompt')}</p>
                      <button
                        type="button"
                        className="btn"
                        disabled={busy}
                        onClick={() => void handleOwnershipClaim()}
                      >
                        {t('register.ownershipClaim')}
                      </button>
                    </div>
                  )}
                  {ownershipFiled && (
                    <p className="form-message">{t('register.ownershipFiled')}</p>
                  )}
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={busy || !termsOk}
                  >
                    {busy ? t('register.submitting') : t('register.submit')}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="landing__footer">
        <div className="landing__footer-links">
          <Link to="/eula">{t('footer.eula')}</Link>
          <Link to="/privacy">{t('footer.privacy')}</Link>
          <Link to="/data">{t('footer.data')}</Link>
        </div>
        <div className="landing__footer-credits">
          <p>
            {t('landing.footerMadeWith')}
            <a href="https://github.com/albertolicea00" target="_blank" rel="noopener noreferrer">
              @albertolicea00
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

function RegisterLogo() {
  return (
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
  )
}
