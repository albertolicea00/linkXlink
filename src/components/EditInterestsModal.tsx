import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import appConfig from '../config/app-config.json'
import { updateOwnProfile } from '../lib/account'
import { notify } from './Toast'
import type { Profile } from '../types'

interface Props {
  profile: Profile
  onClose: () => void
  onSaved: (fields: Partial<Profile>) => void
}

/** Modal to edit the interests chips (capped at `max_interests`). */
export function EditInterestsModal({ profile, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const max = appConfig.max_interests
  const [interests, setInterests] = useState<string[]>(profile.interests ?? [])
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  const toggle = (key: string) => {
    if (interests.includes(key)) {
      setInterests(interests.filter((i) => i !== key))
    } else if (interests.length < max) {
      setInterests([...interests, key])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('saving')
    const { error } = await updateOwnProfile({ interests })
    if (error) {
      setStatus('error')
      notify('error', t('account.saveError'))
      return
    }
    onSaved({ interests })
    notify('success', t('account.saved'))
    onClose()
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <form className="register__form" onSubmit={handleSubmit}>
          <div className="field">
            <span>{t('profileFields.interests', { max })}</span>
            <div className="interest-chips">
              {appConfig.interest_options.map((key) => {
                const selected = interests.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    className={`chip${selected ? ' chip--selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => toggle(key)}
                  >
                    {t(`interests.${key}`)}
                  </button>
                )
              })}
            </div>
          </div>

          {status === 'error' && <p className="form-error">{t('account.saveError')}</p>}
          <div className="modal__actions">
            <button type="button" className="btn" onClick={onClose} disabled={status === 'saving'}>
              {t('account.cancel')}
            </button>
            <button type="submit" className="btn btn--primary" disabled={status === 'saving'}>
              {status === 'saving' ? t('register.submitting') : t('account.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
