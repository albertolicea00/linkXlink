/** Bump this date whenever the EULA or privacy policy text changes. */
export const LEGAL_LAST_UPDATED = '2026-07-04'

export function formatLegalDate(isoDate: string, locale: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
