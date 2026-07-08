import { useTranslation } from 'react-i18next'

interface Props {
  title: string
  message: string
  /** Red confirm button for destructive actions (remove); primary otherwise. */
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Generic yes/no confirmation dialog — promote/remove staff, or any action that shouldn't fire on a single accidental tap. */
export function ConfirmModal({ title, message, danger, busy, onConfirm, onCancel }: Props) {
  const { t } = useTranslation()
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p className="field-help">{message}</p>
        <div className="modal__actions">
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            {t('admin.cancel')}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? t('register.submitting') : t('admin.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
