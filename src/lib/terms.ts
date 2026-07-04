import { LEGAL_LAST_UPDATED } from './legal'

/**
 * Terms acceptance persists in localStorage keyed to the legal-text version:
 * when LEGAL_LAST_UPDATED changes, stored acceptance no longer matches and
 * users must accept again.
 */
const STORAGE_KEY = 'lxl_terms_accepted'

export function hasAcceptedTerms(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === LEGAL_LAST_UPDATED
  } catch {
    return false
  }
}

export function acceptTerms(): void {
  try {
    localStorage.setItem(STORAGE_KEY, LEGAL_LAST_UPDATED)
  } catch {
    // storage unavailable — user will be asked again next time
  }
}
