import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getTheme, setTheme, type Theme } from '../lib/theme'

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

function SunIcon() {
  return (
    <svg {...iconProps} className="theme-toggle__icon">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.3M12 19.7V22M22 12h-2.3M4.3 12H2M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7M19.1 19.1l-1.7-1.7M6.6 6.6 4.9 4.9" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg {...iconProps} className="theme-toggle__icon">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  )
}

export function ThemeToggle() {
  const { t } = useTranslation()
  const [theme, setThemeState] = useState<Theme>(getTheme)

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setThemeState(next)
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={t('nav.theme')}
      title={t('nav.theme')}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
