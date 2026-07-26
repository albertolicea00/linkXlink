import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { StaffGate } from './admin/StaffGate'
import { CONFIG_PATH, ADMIN_PATH } from '../lib/adminPath'
import appConfig from '../config/app-config.json'
import appLinks from '../config/app-links.json'
import devConfig from '../config/dev-config.json'

type Json = unknown

function isPrimitive(v: Json): v is string | number | boolean | null {
  return v === null || ['string', 'number', 'boolean'].includes(typeof v)
}

/** Everything a row can be matched against by the search box, flattened. */
function searchText(key: string, value: Json): string {
  return `${key} ${JSON.stringify(value) ?? ''}`.toLowerCase()
}

function BoolPill({ value }: { value: boolean }) {
  return (
    <span className={`config__bool ${value ? 'config__bool--on' : 'config__bool--off'}`}>
      {value ? 'ON' : 'OFF'}
    </span>
  )
}

function Scalar({ value }: { value: string | number | boolean | null }) {
  if (typeof value === 'boolean') return <BoolPill value={value} />
  if (value === null || value === '') return <span className="config__empty">—</span>
  if (typeof value === 'number') return <code className="config__num">{value}</code>
  const str = String(value)
  // URLs are the bulk of app-links.json — make them openable instead of text.
  if (/^https?:\/\//.test(str)) {
    return (
      <a className="config__link" href={str} target="_blank" rel="noopener noreferrer">
        {str}
      </a>
    )
  }
  return <code className="config__value">{str}</code>
}

/** Object → a compact key/value grid. Used for nested objects and array items. */
function ObjectGrid({ data }: { data: Record<string, Json> }) {
  return (
    <div className="config__object">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="config__object-row">
          <span className="config__object-key">{k}</span>
          <ConfigValue value={v} />
        </div>
      ))}
    </div>
  )
}

function ConfigValue({ value }: { value: Json }) {
  if (isPrimitive(value)) return <Scalar value={value} />

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="config__empty">—</span>
    // A list of plain values reads best as chips; a list of objects needs the
    // full grid per item, numbered so it's clear where each one starts.
    if (value.every(isPrimitive)) {
      return (
        <ul className="config__chips">
          {value.map((v, i) => (
            <li key={i} className="config__chip">
              {String(v)}
            </li>
          ))}
        </ul>
      )
    }
    return (
      <ol className="config__cards">
        {value.map((v, i) => (
          <li key={i} className="config__card">
            {isPrimitive(v) ? <Scalar value={v} /> : <ObjectGrid data={v as Record<string, Json>} />}
          </li>
        ))}
      </ol>
    )
  }

  return <ObjectGrid data={value as Record<string, Json>} />
}

/** One JSON file = one collapsible panel. Search forces every panel open. */
function ConfigPanel({
  title,
  file,
  desc,
  data,
  note,
  query,
}: {
  title: string
  file: string
  desc: string
  data: Record<string, Json>
  note?: string
  query: string
}) {
  const [open, setOpen] = useState(false)

  const entries = useMemo(() => {
    const all = Object.entries(data)
    if (!query) return all
    return all.filter(([k, v]) => searchText(k, v).includes(query))
  }, [data, query])

  // Nothing here matches the search → drop the whole panel from the page.
  if (query && entries.length === 0) return null

  const expanded = open || !!query

  return (
    <section className="config-panel">
      <button
        type="button"
        className="config-panel__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={expanded}
      >
        <span className="config-panel__heading">
          <h3 className="config-panel__title">{title}</h3>
          <code className="config-panel__file">{file}</code>
        </span>
        <span className="config-panel__count">{entries.length}</span>
        <span className={`config-panel__chevron${expanded ? ' config-panel__chevron--open' : ''}`} aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="config-panel__body">
          <p className="field-help">{desc}</p>
          {note && <p className="form-message config-panel__note">{note}</p>}
          <dl className="config__list">
            {entries.map(([key, value]) => (
              <div key={key} className="config__row">
                <dt className="config__key">{key}</dt>
                <dd className="config__cell">
                  <ConfigValue value={value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  )
}

/**
 * Config route (`/admin/config`). Read-only viewer for the three config
 * JSONs: values still change by editing the repo and redeploying, so the
 * header links straight to the source.
 *
 * Reachable only when `show_app_settings_to_admins` is true; with it off the
 * route redirects to the admin dashboard, so the kill switch closes the door
 * and not just the banner that links here.
 */
export function Config() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  if (!devConfig.show_app_settings_to_admins) return <Navigate to={ADMIN_PATH} replace />

  const q = query.trim().toLowerCase()

  const panels = [
    {
      title: t('config.panelApp'),
      file: 'src/config/app-config.json',
      desc: t('config.panelAppDesc'),
      data: appConfig as Record<string, Json>,
    },
    {
      title: t('config.panelLinks'),
      file: 'src/config/app-links.json',
      desc: t('config.panelLinksDesc'),
      note: t('config.panelLinksProtected'),
      data: appLinks as Record<string, Json>,
    },
    {
      title: t('config.panelDev'),
      file: 'src/config/dev-config.json',
      desc: t('config.panelDevDesc'),
      data: devConfig as Record<string, Json>,
    },
  ]

  const totalMatches = q
    ? panels.reduce(
        (n, p) => n + Object.entries(p.data).filter(([k, v]) => searchText(k, v).includes(q)).length,
        0,
      )
    : 0

  return (
    <StaffGate section={t('nav.config')} path={CONFIG_PATH} requires="admin" wide>
      <div className="admin-panel config-page">
        <header className="config-intro">
          <h2 className="config-intro__title">
            {t('config.readOnlyTitle')} 
            &nbsp;&nbsp;
            <a href="https://github.com/albertolicea00/linkXlink/issues/8" target="_blank">(Issue #8)</a>
          </h2>
          <p className="config-intro__text">{t('config.readOnly')}</p>
          <a
            className="btn btn--sm config-intro__link"
            href={appLinks.app_source_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden>
              <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
            </svg>
            {t('config.viewRepo')}
          </a>
        </header>

        <div className="field config-search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('config.searchPlaceholder')}
            aria-label={t('config.searchPlaceholder')}
          />
          {q && <span className="field-help">{t('config.matches', { count: totalMatches })}</span>}
        </div>

        {panels.map((p) => (
          <ConfigPanel key={p.file} {...p} query={q} />
        ))}

        {q && totalMatches === 0 && (
          <p className="app-page__status">{t('config.noResults', { query })}</p>
        )}
      </div>
    </StaffGate>
  )
}
