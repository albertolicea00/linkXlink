import { useTranslation } from 'react-i18next'
import { checkPassword, PASSWORD_MIN } from '../lib/password'

/**
 * Live strong-password requirement list. Shown under a password field while the
 * user types (sign-up, change-password, reset). Each rule ticks green as met.
 */
export function PasswordChecklist({ password }: { password: string }) {
  const { t } = useTranslation()
  const c = checkPassword(password)
  const rules: [boolean, string][] = [
    [c.length, t('password.ruleLength', { min: PASSWORD_MIN })],
    [c.upper, t('password.ruleUpper')],
    [c.lower, t('password.ruleLower')],
    [c.digit, t('password.ruleDigit')],
  ]
  return (
    <ul className="pw-checklist">
      {rules.map(([ok, label]) => (
        <li key={label} className={ok ? 'pw-checklist__item pw-checklist__item--ok' : 'pw-checklist__item'}>
          <span aria-hidden>{ok ? '✓' : '○'}</span> {label}
        </li>
      ))}
    </ul>
  )
}
