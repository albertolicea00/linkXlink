import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Profile } from '../types'
import { ProfileCard } from './ProfileCard'

const SWIPE_THRESHOLD_PX = 60

interface Props {
  profiles: Profile[]
  onSwap: () => void
  onWhatsappClick: () => void
  onReportClick: (profile: Profile) => void
  swapBlocked: boolean
  whatsappDisabled: boolean
}

export function SwipeDeck({
  profiles,
  onSwap,
  onWhatsappClick,
  onReportClick,
  swapBlocked,
  whatsappDisabled,
}: Props) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [dragX, setDragX] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const profile = profiles[Math.min(index, profiles.length - 1)]

  const goTo = (next: number) => {
    if (swapBlocked) return
    if (next < 0 || next >= profiles.length) return
    setIndex(next)
    onSwap()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    setDragX(e.touches[0].clientX - touchStartX.current)
  }

  const handleTouchEnd = () => {
    if (touchStartX.current === null) return
    if (dragX <= -SWIPE_THRESHOLD_PX) goTo(index + 1)
    else if (dragX >= SWIPE_THRESHOLD_PX) goTo(index - 1)
    touchStartX.current = null
    setDragX(0)
  }

  if (!profile) return null

  return (
    <div className="swipe-deck">
      <div
        className="swipe-deck__card"
        style={{ transform: `translateX(${dragX}px) rotate(${dragX / 40}deg)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <ProfileCard
          profile={profile}
          onWhatsappClick={onWhatsappClick}
          onReportClick={() => onReportClick(profile)}
          whatsappDisabled={whatsappDisabled}
        />
      </div>
      <div className="swipe-deck__nav">
        <button
          type="button"
          className="btn"
          onClick={() => goTo(index - 1)}
          disabled={swapBlocked || index === 0}
        >
          ‹ {t('feed.previous')}
        </button>
        <span className="swipe-deck__counter">
          {t('feed.counter', { current: index + 1, total: profiles.length })}
        </span>
        <button
          type="button"
          className="btn"
          onClick={() => goTo(index + 1)}
          disabled={swapBlocked || index === profiles.length - 1}
        >
          {t('feed.next')} ›
        </button>
      </div>
    </div>
  )
}
