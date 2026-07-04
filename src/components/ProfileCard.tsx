import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Profile } from '../types'
import { whatsappUrl } from '../lib/whatsapp'
import { PhotoCarousel } from './PhotoCarousel'

interface Props {
  profile: Profile
  onWhatsappClick?: () => void
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

  return (
    <article className="profile-card">
      <PhotoCarousel photos={profile.photos ?? []} name={profile.name} profileId={profile.id} />
      <div className="profile-card__body">
        <h2 className="profile-card__name">{profile.name}</h2>
        <p className="profile-card__description">{profile.description}</p>
      </div>
      <div className="profile-card__actions">
        {actions !== undefined ? (
          actions
        ) : (
          <>
            <a
              className={`btn btn--whatsapp${whatsappDisabled ? ' btn--disabled' : ''}`}
              href={whatsappDisabled ? undefined : whatsappUrl(profile.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (whatsappDisabled) {
                  e.preventDefault()
                  return
                }
                onWhatsappClick?.()
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
