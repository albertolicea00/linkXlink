/**
 * WhatsApp-click counter over a rolling 24h window (same pattern as
 * swapCounter). Local, per device — feeds the on-screen stats only;
 * server-side metrics live in profile_events.
 */
const STORAGE_KEY = 'lxl_wa_clicks'
const WINDOW_MS = 24 * 60 * 60 * 1000

function load(): number[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown
    return Array.isArray(parsed) ? (parsed as number[]) : []
  } catch {
    return []
  }
}

function prune(timestamps: number[]): number[] {
  const cutoff = Date.now() - WINDOW_MS
  return timestamps.filter((t) => t > cutoff)
}

export function getClickCount(): number {
  return prune(load()).length
}

export function recordClick(): number {
  const timestamps = prune(load())
  timestamps.push(Date.now())
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timestamps))
  } catch {
    // storage unavailable — stat degrades gracefully
  }
  return timestamps.length
}

const FIRST_CLICK_KEY = 'lxl_first_wa_click_done'

/**
 * True exactly once, ever, per device — separate from the rolling 24h counter
 * above (which resets daily and isn't "have they ever clicked"). Used to fire
 * a one-time celebration on the very first WhatsApp click.
 */
export function isFirstWhatsappClick(): boolean {
  try {
    if (localStorage.getItem(FIRST_CLICK_KEY)) return false
    localStorage.setItem(FIRST_CLICK_KEY, '1')
    return true
  } catch {
    return false
  }
}
