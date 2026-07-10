import { useRegisterSW } from 'virtual:pwa-register/react'
import { useTranslation } from 'react-i18next'

/**
 * Service-worker update prompt. `registerType: 'prompt'` (vite.config.ts)
 * means a new deployment does NOT silently swap in mid-session — this bar
 * shows instead, so a long-open tab never keeps calling an RPC whose
 * signature has since changed server-side without the user knowing to reload.
 */
export function UpdatePrompt() {
  const { t } = useTranslation()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Long-open tabs (this is a swipe-deck app people leave open) wouldn't
      // otherwise notice a new deployment until their next full reload —
      // check hourly so needRefresh can still fire mid-session.
      if (!registration) return
      window.setInterval(() => void registration.update(), 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null

  return (
    <>
      <style>{`
        .update-prompt {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9997;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          padding: 0.6rem 1rem calc(0.6rem + env(safe-area-inset-bottom));
          background: var(--color-text, #271c22);
          color: var(--color-bg, #fdf6f9);
          font-size: 0.85rem;
          font-weight: 600;
        }
      `}</style>
      <div className="update-prompt" role="status">
        <span>{t('app.updateAvailable')}</span>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => void updateServiceWorker(true)}
        >
          {t('app.updateReload')}
        </button>
      </div>
    </>
  )
}
