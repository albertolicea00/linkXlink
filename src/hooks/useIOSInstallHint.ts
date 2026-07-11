import { useCallback, useState } from 'react'

/**
 * iOS has no `beforeinstallprompt` — Apple never fires it and there is no web
 * API to trigger the Share sheet or "Add to Home Screen". The best we can do is
 * DETECT the situation and show manual instructions (see `IOSInstallHint`).
 * This is the iOS counterpart to `useInstallPrompt` (Chromium native prompt);
 * the two are mutually exclusive on any given device.
 *
 * Also flags iOS third-party browsers (Chrome/Firefox/Edge on iOS): they run
 * WebKit but CANNOT add to the Home Screen at all — only Safari can — so we
 * surface a distinct "open in Safari" message instead of steps that would fail.
 */
const SEEN_KEY = 'lxl_ios_hint_seen'

function detect() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return { isIOS: false, isSafari: false, isStandalone: true, isIPad: false }
  }
  const ua = navigator.userAgent
  // iPadOS 13+ masquerades as macOS Safari; distinguish it by touch points.
  const isIPadOS = /Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1
  const isIPad = /iPad/i.test(ua) || isIPadOS
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || isIPadOS
  // Every non-Safari iOS browser injects its own engine token; Safari has none.
  const isSafari = !/CriOS|FxiOS|EdgiOS|OPiOS|mercury|GSA/i.test(ua)
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  return { isIOS, isSafari, isStandalone, isIPad }
}

export function useIOSInstallHint() {
  const [{ isIOS, isSafari, isStandalone, isIPad }] = useState(detect)
  const [seen, setSeen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SEEN_KEY) === '1'
    } catch {
      return false
    }
  })

  const markSeen = useCallback(() => {
    setSeen(true)
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      // storage disabled — the hint will just auto-show again next visit
    }
  }, [])

  // Safari + not yet installed → show the manual add-to-home-screen steps.
  const canInstallIOS = isIOS && isSafari && !isStandalone
  // Non-Safari iOS browser + not installed → tell them to open in Safari.
  const needsSafari = isIOS && !isSafari && !isStandalone

  return {
    canInstallIOS,
    needsSafari,
    isIPad,
    /** Surface the overlay unprompted, once per device. */
    autoShow: (canInstallIOS || needsSafari) && !seen,
    markSeen,
  }
}
