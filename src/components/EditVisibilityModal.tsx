import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { updateOwnProfile } from '../lib/account'
import { notify } from './Toast'
import type { Profile } from '../types'

type Visibility = 'visible' | 'until' | 'hidden'

const DURATIONS: { v: string; unit: 'days' | 'weeks' | 'months'; n: number }[] = [
  { v: '3d', unit: 'days', n: 3 },
  { v: '5d', unit: 'days', n: 5 },
  { v: '7d', unit: 'days', n: 7 },
  { v: '2w', unit: 'weeks', n: 2 },
  { v: '3w', unit: 'weeks', n: 3 },
  { v: '4w', unit: 'weeks', n: 4 },
  { v: '2m', unit: 'months', n: 2 },
  { v: '3m', unit: 'months', n: 3 },
  { v: '6m', unit: 'months', n: 6 },
]

/** Frontend computes the target date from a chosen duration (yyyy-mm-dd). */
function computeUntil(v: string): string {
  const o = DURATIONS.find((x) => x.v === v)
  if (!o) return ''
  const d = new Date()
  if (o.unit === 'days') d.setDate(d.getDate() + o.n)
  else if (o.unit === 'weeks') d.setDate(d.getDate() + o.n * 7)
  else d.setMonth(d.getMonth() + o.n)
  return d.toISOString().slice(0, 10)
}

function initialVisibility(p: Profile): Visibility {
  if (p.self_hidden) return 'hidden'
  if (p.hidden_until && new Date(p.hidden_until) > new Date()) return 'until'
  return 'visible'
}

interface Props {
  profile: Profile
  onClose: () => void
  onSaved: (fields: Partial<Profile>) => void
  /** Open with "visible" preselected (used when reached from the "you're hidden"
   *  banner, so the user just has to hit Save to reappear). */
  preselectVisible?: boolean
}

/** Modal to edit profile visibility (visible / hidden-until-date / hidden). */
export function EditVisibilityModal({ profile, onClose, onSaved, preselectVisible }: Props) {
  const { t } = useTranslation()
  const start = preselectVisible ? 'visible' : initialVisibility(profile)
  const [visibility, setVisibility] = useState<Visibility>(start)
  const [hiddenUntil, setHiddenUntil] = useState(
    start === 'until' ? (profile.hidden_until?.slice(0, 10) ?? '') : '',
  )
  const [duration, setDuration] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('saving')
    const patch = {
      self_hidden: visibility === 'hidden',
      hidden_until:
        visibility === 'until' && hiddenUntil ? new Date(hiddenUntil).toISOString() : null,
      clearHiddenUntil: visibility !== 'until',
    }
    const { error } = await updateOwnProfile(patch)
    if (error) {
      setStatus('error')
      notify('error', t('account.saveError'))
      return
    }
    onSaved({ self_hidden: patch.self_hidden, hidden_until: patch.hidden_until })
    notify('success', t('account.saved'))
    onClose()
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('account.visibilityTitle')}</h3>
        <form className="register__form" onSubmit={handleSubmit}>
          <fieldset className="visibility">
            <label className="radio-row">
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'visible'}
                onChange={() => setVisibility('visible')}
              />
              {t('account.visible')}
            </label>
            <label className="radio-row">
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'until'}
                onChange={() => setVisibility('until')}
              />
              {t('account.until')}
            </label>
            {visibility === 'until' && (
              <div className="visibility__duration">
                <select
                  value={duration}
                  onChange={(e) => {
                    setDuration(e.target.value)
                    setHiddenUntil(e.target.value ? computeUntil(e.target.value) : '')
                  }}
                >
                  <option value="" disabled>
                    {t('account.durationChoose')}
                  </option>
                  {DURATIONS.map((d) => (
                    <option key={d.v} value={d.v}>
                      {t(`account.${d.unit}`, { n: d.n })}
                    </option>
                  ))}
                </select>
                {hiddenUntil && (
                  <span className="field-help">
                    {t('account.hiddenUntilInfo', { date: hiddenUntil })}
                  </span>
                )}
              </div>
            )}
            <label className="radio-row">
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'hidden'}
                onChange={() => setVisibility('hidden')}
              />
              {t('account.hidden')}
            </label>
            <span className="field-help">{t('account.visibilityHelp')}</span>
          </fieldset>

          {status === 'error' && <p className="form-error">{t('account.saveError')}</p>}
          <div className="modal__actions">
            <button type="button" className="btn" onClick={onClose} disabled={status === 'saving'}>
              {t('account.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={status === 'saving' || (visibility === 'until' && !hiddenUntil)}
            >
              {status === 'saving' ? t('register.submitting') : t('account.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
