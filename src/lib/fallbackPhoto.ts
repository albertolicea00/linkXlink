import appConfig from '../config/app-config.json'

/**
 * Placeholder for profiles without photos: one of N branded images
 * (public/fallback/fallback-*.svg, TikTok 1080x1920). Variant is derived
 * from the profile id so it varies across profiles but stays stable for
 * the same profile.
 */
export function fallbackPhoto(profileId: string): string {
  let hash = 0
  for (const ch of profileId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return `/fallback/fallback-${(hash % appConfig.fallback_photo_variants) + 1}.svg`
}
