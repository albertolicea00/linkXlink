import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getTheme, setTheme, type Theme } from '../lib/theme'

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
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
