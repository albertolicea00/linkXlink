/**
 * Snoozable banners (community CTAs) — per device, localStorage, same family
 * as the swap/click/hint counters.
 *
 * Dismissing stores the timestamp instead of a permanent flag: the banner stays
 * gone for `community_banner_snooze_days` and then comes back, so the CTA keeps
 * working without nagging. One entry per banner key.
 */
import appConfig from '../config/app-config.json'

const STORAGE_KEY = 'lxl_dismissed_banners'

const SNOOZE_MS = appConfig.community_banner_snooze_days * 24 * 60 * 60 * 1000

function load(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as unknown
    if (parsed && typeof parsed === 'object') return parsed as Record<string, number>
    return {}
  } catch {
    return {}
  }
}

export function isBannerDismissed(key: string): boolean {
  const at = load()[key]
  if (typeof at !== 'number') return false
  // Snooze expired → show it again (and let the next dismiss re-stamp it).
  return Date.now() - at < SNOOZE_MS
}

export function dismissBanner(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...load(), [key]: Date.now() }))
  } catch {
    // storage disabled — banner reappears on reload
  }
}
