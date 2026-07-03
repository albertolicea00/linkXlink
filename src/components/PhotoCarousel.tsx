import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  photos: string[]
  name: string
}

export function PhotoCarousel({ photos, name }: Props) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)

  if (photos.length === 0) {
    return <div className="photo-carousel photo-carousel--empty" aria-hidden="true" />
  }

  const goTo = (i: number) => setIndex((i + photos.length) % photos.length)

  return (
    <div className="photo-carousel">
      <img
        src={photos[index]}
        alt={t('profile.photoOf', { current: index + 1, total: photos.length }) + ` — ${name}`}
        loading="lazy"
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
