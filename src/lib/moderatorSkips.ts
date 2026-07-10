/**
 * Per-moderator, per-device "skipped today" counter for the moderator stats
 * row. Deliberately NOT persisted server-side — it's a UI-only tally, not an
 * audit record (skips are already logged in moderation_actions if that's ever
 * needed). Resets naturally at local midnight since the storage key embeds
 * today's date.
 */
const KEY_PREFIX = 'lxl_mod_skips_'

function todayKey(): string {
  return KEY_PREFIX + new Date().toISOString().slice(0, 10)
}

export function getSkippedToday(): number {
  try {
    return Number(localStorage.getItem(todayKey())) || 0
  } catch {
    return 0
  }
}

export function recordSkip(): number {
  const next = getSkippedToday() + 1
  try {
    localStorage.setItem(todayKey(), String(next))
  } catch {
    // storage disabled — counter just won't persist across reloads
  }
  return next
}
