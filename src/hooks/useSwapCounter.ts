import { useCallback, useState } from 'react'
import appConfig from '../config/app-config.json'
import { getSwapCount, recordSwap } from '../lib/swapCounter'

export function useSwapCounter() {
  const [count, setCount] = useState(getSwapCount)

  const swap = useCallback(() => {
    setCount(recordSwap())
  }, [])

  const limitReached = count >= appConfig.max_swaps_per_24h
  const nearLimit = !limitReached && count >= appConfig.warning_swap_threshold

  return { count, swap, limitReached, nearLimit, max: appConfig.max_swaps_per_24h }
}
