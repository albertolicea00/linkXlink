import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageMeta } from '../hooks/usePageMeta'

function BrokenHeart() {
  return (
    <svg viewBox="0 0 120 120" className="notfound__heart" aria-hidden>
      <defs>
        <linearGradient id="fh" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ec4899" />
          <stop offset="1" stopColor="#fb7185" />
        </linearGradient>
      </defs>
      <path
        d="M60 104 C 42 82 12 62 12 44 C 12 28 26 16 40 16 C 50 16 56 22 60 30 C 64 22 70 16 80 16 C 94 16 108 28 108 44 C 108 62 78 82 60 104 Z"
        fill="url(#fh)"
        strokeLinecap="round"
      />
      <path d="M46 44 l10 14 -8 4 16 16" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function NotFound() {
  const { t } = useTranslation()

  usePageMeta({ title: `404 | Link x Link`, path: '/404', noindex: true })

  return (
    <div className="page notfound">
      <main className="notfound__main">
        <BrokenHeart />
        <h1 className="notfound__code">404</h1>
        <p className="notfound__msg">{t('notFound.title')}</p>
        <Link to="/" className="btn btn--primary btn--large">
          {t('notFound.backHome')}
        </Link>
      </main>
    </div>
  )
}
