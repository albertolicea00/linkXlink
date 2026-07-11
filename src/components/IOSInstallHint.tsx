import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  /** iOS third-party browser (can't add to Home Screen) → show the redirect message instead of steps. */
  needsSafari: boolean
  /** Share button sits in the top toolbar on iPad, the bottom one on iPhone. */
  isIPad: boolean
  onClose: () => void
}

/**
 * Manual "Add to Home Screen" walkthrough for iOS, shown because iOS exposes no
 * programmatic install (see `useIOSInstallHint`). Reuses the shared `.modal`
 * shell so it matches the rest of the app's dialogs.
 */
export function IOSInstallHint({ needsSafari, isIPad, onClose }: Props) {
  const { t } = useTranslation()

  const body: ReactNode = needsSafari ? (
    <p className="field-help">{t('iosInstall.needsSafari')}</p>
  ) : (
    <>
      <p className="field-help">{t('iosInstall.intro')}</p>
      <ol className="ios-hint__steps">
        <li>{t('iosInstall.step1')}</li>
        <li>
          {t('iosInstall.step2', {
            where: t(isIPad ? 'iosInstall.top' : 'iosInstall.bottom'),
          })}{' '}
          <ShareGlyph />
        </li>
        <li>{t('iosInstall.step3')}</li>
        <li>{t('iosInstall.step4')}</li>
      </ol>
    </>
  )

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal ios-hint" onClick={(e) => e.stopPropagation()}>
        <h3>{t('iosInstall.title')}</h3>
        {body}
        <div className="modal__actions">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            {t('iosInstall.gotIt')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** The iOS Share glyph (rounded square + upward arrow) so step 2 points at the real button. */
function ShareGlyph() {
  return (
    <svg
      className="ios-hint__glyph"
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Share"
      role="img"
    >
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M6 12H5a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-1" />
    </svg>
  )
}
