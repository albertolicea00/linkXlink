export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'lxl_theme'

/**
 * The initial theme is resolved before paint by the inline script in
 * index.html (localStorage choice, falling back to system preference).
 * Here we only read and flip the data-theme attribute it sets.
 */
export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // storage unavailable — theme still applies for this session
  }
}
