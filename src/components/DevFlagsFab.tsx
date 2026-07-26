import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import devConfig from '../config/dev-config.json'
import { useNav } from '../context/nav'
import { getDevFlags, setDevFlags, type DevFlags } from '../lib/devFlags'

/**
 * Admin-only developer overrides. A floating </> button (right edge, vertically
 * centered, semi-transparent) opens a modal listing the toggles declared in
 * dev-config.json (`dev_flags`). Flags live in localStorage (see devFlags.ts).
 * Mounted once app-wide; renders nothing for non-admins.
 */
export function DevFlagsFab() {
  const { t } = useTranslation()
  const { role } = useNav()
  const [open, setOpen] = useState(false)
  const [flags, setFlags] = useState<DevFlags>(getDevFlags)

  // Kill switch in dev-config.json — getDevFlags() also purges the stored
  // flags when it's off, so hiding the button is enough here.
  if (!devConfig.show_dev_settings_to_admins) return null
  if (role !== 'admin') return null

  const toggle = (key: string, value: boolean) => {
    const next = { ...flags, [key]: value }
    setDevFlags(next)
    setFlags(next)
  }

  return (
    <>
      <button
        type="button"
        className="dev-fab"
        onClick={() => setOpen(true)}
        aria-label={t('dev.title')}
      >
        {'</>'}
      </button>

      {open && (
        <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={t('dev.title')}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{t('dev.title')}</h3>
            <p className="field-help">{t('dev.help')}</p>
            {devConfig.dev_flags.map(({ key, labelKey }) => (
              <label key={key} className="dev-panel__item">
                <input
                  type="checkbox"
                  checked={!!flags[key]}
                  onChange={(e) => toggle(key, e.target.checked)}
                />
                <span>{t(labelKey)}</span>
              </label>
            ))}
            <p className="field-help">{t('dev.reloadHint')}</p>
            <div className="modal__actions">
              <button type="button" className="btn" onClick={() => setOpen(false)}>
                {t('dev.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
