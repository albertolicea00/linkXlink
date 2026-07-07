/**
 * Password strength rules, shared by sign-up, change-password and reset.
 * Kept deliberately simple (length + character variety) — enough to block
 * obviously weak passwords without frustrating users.
 */
export interface PasswordChecks {
  length: boolean
  upper: boolean
  lower: boolean
  digit: boolean
}

export const PASSWORD_MIN = 8

export function checkPassword(pw: string): PasswordChecks {
  return {
    length: pw.length >= PASSWORD_MIN,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /\d/.test(pw),
  }
}

export function isStrongPassword(pw: string): boolean {
  const c = checkPassword(pw)
  return c.length && c.upper && c.lower && c.digit
}
