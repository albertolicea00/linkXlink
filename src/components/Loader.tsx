import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './Loader.css'

interface LoaderProps {
  text?: string
}

export function Loader({ text }: LoaderProps) {
  const { t, i18n } = useTranslation()
  const [titleIdx, setTitleIdx] = useState(0)
  const [tipIdx, setTipIdx] = useState(0)

  useEffect(() => {
    // Pick initial random indices
    const titles = t('loadingMessages.title', { returnObjects: true }) as string[]
    const tips = t('loadingMessages.tips', { returnObjects: true }) as string[]
    
    if (Array.isArray(titles) && Array.isArray(tips)) {
      setTitleIdx(Math.floor(Math.random() * titles.length))
      setTipIdx(Math.floor(Math.random() * tips.length))
    }

    const interval = setInterval(() => {
      if (Array.isArray(titles)) {
        setTitleIdx((prev) => (prev + 1) % titles.length)
      }
      if (Array.isArray(tips)) {
        setTipIdx((prev) => (prev + 1) % tips.length)
      }
    }, 4500)

    return () => clearInterval(interval)
  }, [t, i18n.language])

  const titles = t('loadingMessages.title', { returnObjects: true }) as string[]
  const tips = t('loadingMessages.tips', { returnObjects: true }) as string[]

  const currentTitle = Array.isArray(titles) ? titles[titleIdx] : 'Loading...'
  const currentTip = Array.isArray(tips) ? tips[tipIdx] : ''

  return (
    <div className="loader-container">
      <div className="loader-heart">
        <svg viewBox="0 0 512 512">
          <path d="M256 400
                   C 214 366 128 300 128 222
                   C 128 172 166 136 212 136
                   C 238 136 246 148 256 162
                   C 266 148 274 136 300 136
                   C 346 136 384 172 384 222
                   C 384 300 298 366 256 400 Z" />
        </svg>
      </div>
      
      {text ? (
        <p className="loader-text">{text}</p>
      ) : (
        <div className="loader-messages">
          <p className="loader-title">{currentTitle}</p>
          {currentTip && (
            <p className="loader-tip" dangerouslySetInnerHTML={{ __html: currentTip }}></p>
          )}
        </div>
      )}
    </div>
  )
}
