import appConfig from '../config/app-config.json'

/**
 * Share gate for self-registration: the user must share the app link with
 * N people before submitting their profile. Client-side counter only — it
 * counts share-button taps, not verified deliveries. Real referral
 * validation (who joined through whose link) is a future feature.
 */
const STORAGE_KEY = 'lxl_register_shares'

export const REQUIRED_SHARES: number = appConfig.required_shares_to_register

export function getShareCount(): number {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || 0
  } catch {
    return 0
  }
}

export function incrementShareCount(): number {
  const next = getShareCount() + 1
  try {
    localStorage.setItem(STORAGE_KEY, String(next))
  } catch {
    // storage unavailable — user keeps the in-memory count for this visit
  }
  return next
}
