import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReportReason } from '../types'
import { hasReported, submitReport } from '../lib/reports'
import { notify } from './Toast'

const REASONS: ReportReason[] = ['link_not_found', 'wrong_number', 'fraudulent']

interface Props {
  profileId: string
  onClose: () => void
  onReported: () => void
}

export function ReportModal({ profileId, onClose, onReported }: Props) {
  const { t } = useTranslation()
  const [reason, setReason] = useState<ReportReason>('link_not_found')
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'duplicate'>(
    hasReported(profileId) ? 'duplicate' : 'idle',
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    const { error } = await submitReport(profileId, reason, comment)
    if (error) {
      setStatus('error')
      notify('error', t('report.error'))
    } else {
      setStatus('sent')
      onReported()
      notify('success', t('report.success'))
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('report.title')}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t('report.title')}</h3>

        {status === 'sent' && (
          <>
            <p className="modal__message modal__message--success">{t('report.success')}</p>
            <button type="button" className="btn" onClick={onClose}>
              {t('report.cancel')}
            </button>
          </>
        )}

        {status === 'duplicate' && (
          <>
            <p className="modal__message">{t('report.alreadyReported')}</p>
            <button type="button" className="btn" onClick={onClose}>
              {t('report.cancel')}
            </button>
          </>
        )}

        {(status === 'idle' || status === 'sending' || status === 'error') && (
          <form onSubmit={handleSubmit}>
            <fieldset disabled={status === 'sending'}>
              <legend>{t('report.reasonLabel')}</legend>
              {REASONS.map((r) => (
                <label key={r} className="radio-row">
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                  />
                  {t(`report.reason_${r}`)}
                </label>
              ))}
              <label className="field">
                {t('report.commentLabel')}
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('report.commentPlaceholder')}
                  maxLength={500}
                  rows={3}
                />
              </label>
            </fieldset>
            {status === 'error' && (
              <p className="modal__message modal__message--error">{t('report.error')}</p>
            )}
            <div className="modal__actions">
              <button type="button" className="btn" onClick={onClose}>
                {t('report.cancel')}
              </button>
              <button type="submit" className="btn btn--primary" disabled={status === 'sending'}>
                {t('report.submit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
