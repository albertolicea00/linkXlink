import { useTranslation } from 'react-i18next'

interface Props {
  title: string
  message?: string
  /** Close button label; defaults to a generic "OK". */
  closeLabel?: string
  onClose: () => void
}

/**
 * Centered success popup — a friendly confirmation after actions like sign-up
 * or password change. Reusable: pass already-translated strings.
 */
export function SuccessModal({ title, message, closeLabel, onClose }: Props) {
  const { t } = useTranslation()
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal success-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="success-modal__badge" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="34" height="34">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h3>{title}</h3>
        {message && <p className="success-modal__text">{message}</p>}
        <button type="button" className="btn btn--primary" onClick={onClose}>
          {closeLabel ?? t('common.ok')}
        </button>
      </div>
    </div>
  )
}
