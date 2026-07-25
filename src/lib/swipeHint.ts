/**
 * "Swipe the card" hint visibility — per device, localStorage (same family as
 * the swap/click counters: tiny synchronous flag, no need for IndexedDB).
 *
 * The hint teaches the gesture, so it only earns its vertical space for the
 * first N swipes (`swipe_hint_swipes`). Once spent it disappears and comes
 * back after `swipe_hint_reset_hours` (a returning user may have forgotten,
 * or be on a device someone else swiped on).
 */
import appConfig from '../config/app-config.json'

const STORAGE_KEY = 'lxl_swipe_hint'

const LIMIT = appConfig.swipe_hint_swipes
const RESET_MS = appConfig.swipe_hint_reset_hours * 60 * 60 * 1000

type State = {
  /** Swipes counted in the current hint window. */
  n: number
  /** When the hint was spent (n reached LIMIT); null while still showing. */
  hiddenAt: number | null
}

const EMPTY: State = { n: 0, hiddenAt: null }

function load(): State {
  let state = EMPTY
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as unknown
    if (parsed && typeof parsed === 'object') {
      const { n, hiddenAt } = parsed as Partial<State>
      state = {
        n: typeof n === 'number' ? n : 0,
        hiddenAt: typeof hiddenAt === 'number' ? hiddenAt : null,
      }
    }
  } catch {
    return EMPTY
  }
  // Window expired → the hint becomes visible again from scratch.
  if (state.hiddenAt !== null && Date.now() - state.hiddenAt >= RESET_MS) return EMPTY
  return state
}

function save(state: State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage disabled — hint just shows every session
  }
}

export function isSwipeHintVisible(): boolean {
  return LIMIT > 0 && load().n < LIMIT
}

/** Counts one swipe against the hint budget. Returns the new visibility. */
export function recordSwipeHintSwipe(): boolean {
  if (LIMIT <= 0) return false
  const state = load()
  if (state.n >= LIMIT) return false
  const n = state.n + 1
  save({ n, hiddenAt: n >= LIMIT ? Date.now() : null })
  return n < LIMIT
}
