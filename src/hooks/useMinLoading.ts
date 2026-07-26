import { useState, useEffect } from 'react'
import appConfig from '../config/app-config.json'

/**
 * Ensures that if a loading state becomes true, it stays true for a minimum amount of time.
 * This guarantees that animations (like the Loader) complete at least one cycle.
 */
export function useMinLoading(isBaseLoading: boolean | null | undefined) {
  const [minLoadDone, setMinLoadDone] = useState(!isBaseLoading)

  useEffect(() => {
    if (isBaseLoading) {
      setMinLoadDone(false)
      const timer = setTimeout(() => setMinLoadDone(true), appConfig.min_loading_time_ms || 4000)
      return () => clearTimeout(timer)
    }
  }, [isBaseLoading])

  return !!isBaseLoading || !minLoadDone
}
