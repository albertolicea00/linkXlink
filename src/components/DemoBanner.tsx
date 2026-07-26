import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNav } from '../context/nav'
import { isDemoUserId } from '../lib/mockFetch'

/**
 * Persistent notice while a demo account is signed in: the data on screen is
 * fabricated and nothing is being written anywhere. Collapsible (it sits on
 * top of every page) but not dismissable — someone poking at the demo should
 * never be able to forget the profiles are not real people.
 *
 * Renders nothing for real sessions; `isDemoUserId` also honors the per-account
 * `demo_*` switches in dev-config.json.
 */
export function DemoBanner() {
  const { t } = useTranslation()
  const { session } = useNav()
  const [open, setOpen] = useState(true)

  if (!isDemoUserId(session?.user?.id)) return null

  return (
    <div className={`demo-banner${open ? '' : ' demo-banner--collapsed'}`} role="status">
      <span className="demo-banner__badge">{t('demo.badge')}</span>
      {open && <span className="demo-banner__text">{t('demo.text')}</span>}
      <button
        type="button"
        className="demo-banner__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? t('demo.hide') : t('demo.show')}
      </button>
    </div>
  )
}
