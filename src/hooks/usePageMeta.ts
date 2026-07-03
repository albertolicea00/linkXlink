import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import appConfig from '../config/app-config.json'

interface PageMeta {
  title: string
  description?: string
  /** Route path used to build the canonical URL, e.g. "/app" */
  path: string
  noindex?: boolean
}

function upsertMeta(name: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.name = name
    document.head.appendChild(el)
  }
  el.content = content
}

function removeMeta(name: string): void {
  document.head.querySelector(`meta[name="${name}"]`)?.remove()
}

function upsertCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

/**
 * Per-route SEO metadata for the SPA: title, description, canonical URL,
 * html lang and optional noindex. Runs client-side; crawlers executing JS
 * (Googlebot) pick these up.
 */
export function usePageMeta({ title, description, path, noindex }: PageMeta): void {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage ?? appConfig.default_language

  useEffect(() => {
    document.title = title
    document.documentElement.lang = lang
    if (description) upsertMeta('description', description)
    upsertCanonical(appConfig.site_url + path)
    if (noindex) upsertMeta('robots', 'noindex, nofollow')
    else removeMeta('robots')
  }, [title, description, path, noindex, lang])
}
