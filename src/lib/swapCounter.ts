/**
 * Client-side swap counter over a rolling 24h window, persisted in localStorage.
 * Soft UX guard only — not a security boundary (no user accounts exist).
 */
const STORAGE_KEY = 'lxl_swaps'
const WINDOW_MS = 24 * 60 * 60 * 1000

interface SwapStore {
  timestamps: number[]
}

function load(): SwapStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { timestamps: [] }
    const parsed = JSON.parse(raw) as SwapStore
    if (!Array.isArray(parsed.timestamps)) return { timestamps: [] }
    return parsed
  } catch {
    return { timestamps: [] }
  }
}

function save(store: SwapStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // storage full or unavailable — counter degrades gracefully
  }
}

function prune(store: SwapStore): SwapStore {
  const cutoff = Date.now() - WINDOW_MS
  return { timestamps: store.timestamps.filter((t) => t > cutoff) }
}

export function getSwapCount(): number {
  return prune(load()).timestamps.length
}

export function recordSwap(): number {
  const store = prune(load())
  store.timestamps.push(Date.now())
  save(store)
  return store.timestamps.length
}
