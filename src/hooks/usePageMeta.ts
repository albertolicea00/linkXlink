import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import appConfig from '../config/app-config.json'

interface PageMeta {
  title: string
  description?: string
  /** Route path used to build the canonical URL, e.g. "/app" */
  path: string
  noindex?: boolean
  /** Absolute path of the Open Graph image, e.g. "/og-en.png" */
  ogImage?: string
}

const OG_LOCALES: Record<string, string> = { es: 'es_ES', en: 'en_US' }

function upsertMeta(name: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.name = name
    document.head.appendChild(el)
  }
  el.content = content
}

function upsertProperty(property: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
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
 * html lang, Open Graph/Twitter sync and optional noindex. Runs client-side;
 * crawlers executing JS (Googlebot) pick these up. Link-preview scrapers
 * (WhatsApp/Facebook) do NOT run JS — they only see the static Spanish
 * defaults in index.html.
 */
export function usePageMeta({ title, description, path, noindex, ogImage }: PageMeta): void {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage ?? appConfig.default_language

  useEffect(() => {
    const url = appConfig.site_url + path

    document.title = title
    document.documentElement.lang = lang
    upsertCanonical(url)

    upsertProperty('og:title', title)
    upsertProperty('og:url', url)
    upsertProperty('og:locale', OG_LOCALES[lang] ?? OG_LOCALES.es)
    upsertMeta('twitter:title', title)
    if (description) {
      upsertMeta('description', description)
      upsertProperty('og:description', description)
      upsertMeta('twitter:description', description)
    }
    if (ogImage) {
      upsertProperty('og:image', appConfig.site_url + ogImage)
      upsertMeta('twitter:image', appConfig.site_url + ogImage)
    }

    if (noindex) upsertMeta('robots', 'noindex, nofollow')
    else removeMeta('robots')
  }, [title, description, path, noindex, ogImage, lang])
}
