import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Profile } from '../types'
import { whatsappUrl, isStandalone } from '../lib/whatsapp'
import { ageFromBirthdate } from '../lib/age'
import appConfig from '../config/app-config.json'
import { PhotoCarousel } from './PhotoCarousel'

interface Props {
  profile: Profile
  onWhatsappClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  onReportClick?: () => void
  whatsappDisabled?: boolean
  /** Replaces the default WhatsApp/Report action row (e.g. moderation view). */
  actions?: ReactNode
}

export function ProfileCard({
  profile,
  onWhatsappClick,
  onReportClick,
  whatsappDisabled = false,
  actions,
}: Props) {
  const { t } = useTranslation()
  const age = ageFromBirthdate(profile.birthdate)
  const interests = profile.interests ?? []
  const waMessage = appConfig.whatsapp_prefill_enabled
    ? t('feed.whatsappMessage', { name: profile.name })
    : undefined

  return (
    <article className="profile-card">
      <div className="profile-card__media">
        <PhotoCarousel photos={profile.photos ?? []} name={profile.name} profileId={profile.id} />
        <div className="profile-card__overlay">
          <h2 className="profile-card__name">
            {profile.name}
            {appConfig.show_age && age !== null && (
              <span className="profile-card__age">, {age}</span>
            )}
          </h2>
          {profile.region && (
            <p className="profile-card__region">
              <span aria-hidden>📍</span> {profile.region}
            </p>
          )}
          {profile.description && (
            <p className="profile-card__description">{profile.description}</p>
          )}
          {interests.length > 0 && (
            <ul className="profile-card__interests">
              {interests.map((key) => (
                <li key={key} className="chip profile-card__chip">
                  {t(`interests.${key}`, key)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="profile-card__actions">
        {actions !== undefined ? (
          actions
        ) : (
          <>
            <a
              className={`btn btn--whatsapp${whatsappDisabled ? ' btn--disabled' : ''}`}
              href={whatsappDisabled ? undefined : whatsappUrl(profile.whatsapp, waMessage)}
              // Installed PWA: same tab, so the OS hands off to WhatsApp with no
              // visible tab-spawn. Regular browser tab: keep target="_blank" so
              // leaving for wa.me never loses the visitor's place in the deck.
              target={isStandalone() ? undefined : '_blank'}
              rel="noopener noreferrer"
              onClick={(e) => {
                if (whatsappDisabled) {
                  e.preventDefault()
                  return
                }
                onWhatsappClick?.(e)
              }}
              aria-disabled={whatsappDisabled}
            >
              {t('profile.openWhatsApp')}
            </a>
            <button type="button" className="btn btn--report" onClick={onReportClick}>
              {t('profile.report')}
            </button>
          </>
        )}
      </div>
    </article>
  )
}
