import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ProfileExtraFields } from './ProfileExtraFields'
import { updateOwnProfile } from '../lib/account'
import { notify } from './Toast'
import type { Gender, InterestedIn, Profile } from '../types'

interface Props {
  profile: Profile
  onClose: () => void
  /** Called with the saved fields so the parent can update its local profile. */
  onSaved: (fields: Partial<Profile>) => void
}

/**
 * Modal form to edit the own-profile fields the `update_own_profile` RPC allows
 * (name, bio, gender, interested-in, interests, region). Owns its form state,
 * saves itself, then hands the saved values back to the parent and closes.
 */
export function EditProfileModal({ profile, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState(profile.name)
  const [description, setDescription] = useState(profile.description)
  const [gender, setGender] = useState<Gender | ''>((profile.gender as Gender) ?? '')
  const [interestedIn, setInterestedIn] = useState<InterestedIn | ''>(
    (profile.interested_in as InterestedIn) ?? '',
  )
  const [region, setRegion] = useState(profile.region ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('saving')
    const patch = {
      name: name.trim(),
      description: description.trim(),
      gender: (gender || undefined) as Gender | undefined,
      interested_in: (interestedIn || undefined) as InterestedIn | undefined,
      region: region.trim() || undefined,
    }
    const { error } = await updateOwnProfile(patch)
    if (error) {
      setStatus('error')
      notify('error', t('account.saveError'))
      return
    }
    onSaved({
      name: patch.name,
      description: patch.description,
      gender: patch.gender ?? null,
      interested_in: patch.interested_in ?? null,
      region: patch.region ?? profile.region,
    })
    notify('success', t('account.saved'))
    onClose()
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <form className="register__form" onSubmit={handleSubmit}>
          <label className="field">
            {t('admin.name')}
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </label>
          <label className="field">
            {t('admin.description')}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              rows={3}
            />
          </label>

          <ProfileExtraFields
            gender={gender}
            interestedIn={interestedIn}
            region={region}
            onGender={setGender}
            onInterestedIn={setInterestedIn}
            onRegion={setRegion}
            showInterests={false}
          />

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
