import appLinks from '../config/app-links.json'

export function GithubLink() {
  if (appLinks.app_source_hide || !appLinks.app_source_url) {
    return null
  }

  return (
    <a
      href={appLinks.app_source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="theme-toggle"
      aria-label="GitHub"
      title="GitHub"
      style={{ color: 'var(--color-text)' }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="theme-toggle__icon"
        aria-hidden="true"
      >
        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.24c3-.34 6-1.54 6-6.76a5.64 5.64 0 0 0-1.54-3.9 5.22 5.22 0 0 0-.15-3.84s-1.25-.4-4.1 1.54a14.28 14.28 0 0 0-7.5 0c-2.85-1.94-4.1-1.54-4.1-1.54a5.22 5.22 0 0 0-.15 3.84 5.64 5.64 0 0 0-1.54 3.9c0 5.22 3 6.42 6 6.76a4.8 4.8 0 0 0-1 3.24V22" />
        <path d="M9 20c-4.5 1.5-5-2.5-7-3" />
      </svg>
    </a>
  )
}
