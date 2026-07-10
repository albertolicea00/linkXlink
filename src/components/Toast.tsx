import { useEffect, useState } from 'react'
import { fireConfetti } from './Confetti'

/**
 * Global toast notifications — self-contained (styles included), decoupled
 * from any single page's component lifecycle on purpose.
 *
 * Why: a background action (saving a profile, uploading a photo, submitting
 * a report…) keeps running even if the user navigates away mid-request —
 * client-side route changes don't abort in-flight fetches. But feedback tied
 * to that page's local state (`setStatus('saved')`) is lost the moment the
 * component unmounts. `notify()` is a plain function, not a hook — callable
 * from any async handler regardless of whether its component is still
 * mounted by the time the request resolves, so the user always learns the
 * outcome no matter where they've navigated to since.
 *
 * Usage:
 *   1. Mount <ToastRoot /> ONCE, near the app root.
 *   2. Call notify('success' | 'error' | 'warning' | 'info', message) from
 *      any async action's completion — no import of React state needed.
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

let idCounter = 0
let listeners: Array<(item: ToastItem) => void> = []

const DURATION_MS: Record<ToastType, number> = {
  success: 3500,
  info: 3500,
  warning: 5000,
  error: 6000,
}

/** Fire a toast from anywhere — safe to call even if <ToastRoot /> hasn't mounted yet (just a no-op then). */
export function notify(type: ToastType, message: string): void {
  const item: ToastItem = { id: ++idCounter, type, message }
  listeners.forEach((l) => l(item))

  // Success toasts get a little confetti burst from the same spot the toast
  // itself appears (top-center), falling away below it.
  if (type === 'success') {
    fireConfetti({
      origin: { xPercent: 50, yPercent: 6 },
      direction: 'down',
      bursts: 1,
      count: 50,
      spread: 260,
      duration: 1,
    })
  }
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
}

export function ToastRoot() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    const handler = (item: ToastItem) => {
      setItems((prev) => [...prev, item])
      window.setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== item.id))
      }, DURATION_MS[item.type])
    }
    listeners.push(handler)
    return () => {
      listeners = listeners.filter((l) => l !== handler)
    }
  }, [])

  const dismiss = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id))

  return (
    <>
      <style>{`
        .toast-root {
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 1rem);
          left: 50%;
          transform: translateX(-50%);
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          width: min(92vw, 380px);
          pointer-events: none;
        }
        .toast {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.7rem 0.9rem;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #fff;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
          animation: toast-in 0.2s ease-out;
          cursor: pointer;
        }
        .toast--success { background: #1da851; }
        .toast--error { background: #e5484d; }
        .toast--warning { background: #b4740e; }
        .toast--info { background: #3b6fd8; }
        .toast__icon {
          flex: 0 0 auto;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
        }
        .toast__msg {
          flex: 1;
          line-height: 1.3;
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="toast-root" aria-live="polite">
        {items.map((item) => (
          <div
            key={item.id}
            className={`toast toast--${item.type}`}
            onClick={() => dismiss(item.id)}
            role="status"
          >
            <span className="toast__icon" aria-hidden>
              {ICONS[item.type]}
            </span>
            <span className="toast__msg">{item.message}</span>
          </div>
        ))}
      </div>
    </>
  )
}
