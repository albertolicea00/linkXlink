import { useState, useEffect, useRef } from 'react'
import appConfig from '../config/app-config.json'

/**
 * Ensures that if a loading state becomes true, it stays true for a minimum
 * amount of time. This guarantees that animations (like the Loader) complete
 * at least one cycle.
 *
 * The timer is armed when loading ENDS, for whatever is left of the minimum
 * window — not while loading is still running. An earlier version started the
 * timeout inside the `isBaseLoading === true` branch, so when loading finished
 * the effect re-ran, its cleanup cleared the pending timeout, and nothing ever
 * set `minLoadDone` again: the hook returned `true` forever and the page was
 * stuck on the loader.
 */
export function useMinLoading(isBaseLoading: boolean | null | undefined) {
  const [minLoadDone, setMinLoadDone] = useState(!isBaseLoading)
  // When the current loading spell started, so the wait counts time already
  // spent loading instead of adding the full delay on top of it.
  const startedAt = useRef<number | null>(isBaseLoading ? Date.now() : null)

  useEffect(() => {
    if (isBaseLoading) {
      startedAt.current = Date.now()
      setMinLoadDone(false)
      return
    }

    // Never loaded in this component's life → nothing to hold on screen.
    if (startedAt.current === null) {
      setMinLoadDone(true)
      return
    }

    const min = appConfig.min_loading_time_ms || 0
    const remaining = min - (Date.now() - startedAt.current)
    if (remaining <= 0) {
      setMinLoadDone(true)
      return
    }

    const timer = setTimeout(() => setMinLoadDone(true), remaining)
    return () => clearTimeout(timer)
  }, [isBaseLoading])

  return !!isBaseLoading || !minLoadDone
}
