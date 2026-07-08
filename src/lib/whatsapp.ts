/**
 * WhatsApp numbers are stored digits-only with country code.
 * Sanitization here is the last line of defense before rendering a link.
 */
export function sanitizeWhatsappNumber(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function isValidWhatsappNumber(raw: string): boolean {
  const digits = sanitizeWhatsappNumber(raw)
  return digits.length >= 8 && digits.length <= 15
}

export function whatsappUrl(raw: string, message?: string): string {
  const base = `https://wa.me/${sanitizeWhatsappNumber(raw)}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

/**
 * True when running installed/standalone (added to home screen), as opposed
 * to a regular browser tab. Only in standalone mode is it safe to navigate
 * the WhatsApp link in the SAME tab — opening a new tab there is what spawns
 * the jarring "kicked out to a browser tab" flash before the OS hands off to
 * the WhatsApp app. A regular browser tab keeps target="_blank" so leaving
 * for wa.me never loses the visitor's place in the deck.
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari legacy flag — no display-mode support pre-PWA-install detection.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}
