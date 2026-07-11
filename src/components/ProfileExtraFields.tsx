import { useTranslation } from 'react-i18next'
import appConfig from '../config/app-config.json'
import type { Gender, InterestedIn } from '../types'

const GENDERS = appConfig.gender_options as Gender[]
const INTERESTED: InterestedIn[] = ['male', 'female', 'both']

interface Props {
  gender: Gender | ''
  interestedIn: InterestedIn | ''
  region: string
  onGender: (g: Gender) => void
  onInterestedIn: (i: InterestedIn) => void
  onRegion: (r: string) => void
  /** Interests are managed separately on the account page, so they can be
   *  hidden here. Registration passes the picker in. Default: shown. */
  showInterests?: boolean
  interests?: string[]
  onInterests?: (list: string[]) => void
}

/**
 * Gender / interested-in / region picker, shared by registration and the
 * account page, with an optional interests picker (chosen from the config
 * default list, capped at `max_interests`).
 */
export function ProfileExtraFields({
  gender,
  interestedIn,
  region,
  onGender,
  onInterestedIn,
  onRegion,
  showInterests = true,
  interests = [],
  onInterests,
}: Props) {
  const { t } = useTranslation()
  const max = appConfig.max_interests

  const toggleInterest = (key: string) => {
    if (!onInterests) return
    if (interests.includes(key)) {
      onInterests(interests.filter((i) => i !== key))
    } else if (interests.length < max) {
      onInterests([...interests, key])
    }
  }

  return (
    <>
      <div className="field-row">
        <label className="field">
          {t('profileFields.gender')}
          <select value={gender} onChange={(e) => onGender(e.target.value as Gender)}>
            <option value="" disabled>
              {t('profileFields.choose')}
            </option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {t(`profileFields.gender_${g}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          {t('profileFields.interestedIn')}
          <select
            value={interestedIn}
            onChange={(e) => onInterestedIn(e.target.value as InterestedIn)}
          >
            <option value="" disabled>
              {t('profileFields.choose')}
            </option>
            {INTERESTED.map((i) => (
              <option key={i} value={i}>
                {t(`profileFields.interested_${i}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <span className="field-help">{t('profileFields.interestedInHelp')}</span>

      <label className="field">
        {t('profileFields.region')}
        <input
          type="text"
          maxLength={80}
          value={region}
          placeholder={t('profileFields.regionPlaceholder')}
          onChange={(e) => onRegion(e.target.value)}
        />
        <span className="field-help">{t('profileFields.regionHelp')}</span>
      </label>

      {showInterests && (
        <div className="field">
          <span>{t('profileFields.interests', { max })}</span>
          <div className="interest-chips">
            {appConfig.interest_options.map((key) => {
              const selected = interests.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  className={`chip${selected ? ' chip--selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() => toggleInterest(key)}
                >
                  {t(`interests.${key}`)}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
