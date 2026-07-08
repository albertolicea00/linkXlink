import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import appConfig from '../../config/app-config.json'

/**
 * Deny picker: reasons come from app-config (moderation_deny_reasons) and are
 * shown as a localized list, but the value stored is plain text — the canonical
 * reason key, or the free text typed for "other".
 */
export function DenyReasonModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: string) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const reasons = appConfig.moderation_deny_reasons
  const [selected, setSelected] = useState<string>('')
  const [custom, setCustom] = useState('')

  const isOther = selected === 'other'
  const reason = isOther ? custom.trim() : selected
  const canConfirm = reason.length > 0

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h3>{t('admin.denyTitle')}</h3>
        <div className="deny-reasons">
          {reasons.map((key) => (
            <label key={key} className="deny-reasons__item">
              <input
                type="radio"
                name="deny-reason"
                value={key}
                checked={selected === key}
                onChange={() => setSelected(key)}
              />
              <span>{t(`admin.denyReason.${key}`)}</span>
            </label>
          ))}
        </div>
        {isOther && (
          <input
            type="text"
            className="input"
            maxLength={500}
            placeholder={t('admin.denyReasonOtherPlaceholder')}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        )}
        <div className="modal__actions">
          <button type="button" className="btn" onClick={onCancel}>
            {t('admin.cancel')}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            disabled={!canConfirm}
            onClick={() => onConfirm(reason)}
          >
            {t('admin.deny')}
          </button>
        </div>
      </div>
    </div>
  )
}
