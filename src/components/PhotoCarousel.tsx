import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fallbackPhoto } from '../lib/fallbackPhoto'
import { useKeepAliveActive } from '../context/keepAlive'

interface Props {
  photos: string[]
  name: string
  /** Picks a stable branded fallback image when there are no photos. */
  profileId?: string
}

export function PhotoCarousel({ photos, name, profileId }: Props) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const imgRef = useRef<HTMLImageElement>(null)
  const active = useKeepAliveActive()

  const retryIfUnloaded = () => {
    const img = imgRef.current
    if (!img) return
    if (img.complete && img.naturalWidth > 0) return
    const src = img.getAttribute('src')
    if (!src) return
    img.src = src
  }

  useEffect(() => {
    if (active) retryIfUnloaded()
  }, [active, photos, index])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') retryIfUnloaded()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [photos, index])

  if (photos.length === 0) {
    return (
      <div className="photo-carousel photo-carousel--empty" aria-hidden="true">
        <img src={fallbackPhoto(profileId ?? name)} alt="" loading="eager" decoding="sync" draggable={false} />
      </div>
    )
  }

  const goTo = (i: number) => setIndex((i + photos.length) % photos.length)

  return (
    <div className="photo-carousel">
      <img
        ref={imgRef}
        src={photos[index]}
        alt={t('profile.photoOf', { current: index + 1, total: photos.length }) + ` — ${name}`}
        loading="eager"
        decoding="sync"
        draggable={false}
      />
      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="photo-carousel__nav photo-carousel__nav--prev"
            onClick={() => goTo(index - 1)}
            aria-label={t('feed.previous')}
          >
            ‹
          </button>
          <button
            type="button"
            className="photo-carousel__nav photo-carousel__nav--next"
            onClick={() => goTo(index + 1)}
            aria-label={t('feed.next')}
          >
            ›
          </button>
          <div className="photo-carousel__dots">
            {photos.map((_, i) => (
              <span key={i} className={i === index ? 'dot dot--active' : 'dot'} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
