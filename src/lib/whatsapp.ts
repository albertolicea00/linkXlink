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

export function whatsappUrl(raw: string): string {
  return `https://wa.me/${sanitizeWhatsappNumber(raw)}`
}
