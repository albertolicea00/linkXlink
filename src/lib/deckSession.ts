/**
 * Per-tab deck cursor (survives refresh, dies with the tab).
 * Keeps the unswiped card order so a reload doesn't reshuffle the pile.
 */
const PREFIX = 'lxl_deck_'

export type DeckSession = {
  ids: string[]
  index: number
  currentId: string | null
}

export function loadDeckSession(key: string): DeckSession | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DeckSession
    if (!Array.isArray(parsed.ids) || typeof parsed.index !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

export function saveDeckSession(key: string, session: DeckSession): void {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(session))
  } catch {
    // quota / private mode — deck just won't survive a refresh
  }
}

export function clearDeckSession(key: string): void {
  try {
    sessionStorage.removeItem(PREFIX + key)
  } catch {
    // no-op
  }
}

/** Keep previous order; refresh fields from `incoming`; append newcomers. */
export function mergeKeepingOrder<T extends { id: string }>(previous: T[], incoming: T[]): T[] {
  const incomingById = new Map(incoming.map((p) => [p.id, p]))
  const kept = previous.filter((p) => incomingById.has(p.id)).map((p) => incomingById.get(p.id)!)
  const seen = new Set(kept.map((p) => p.id))
  const added = incoming.filter((p) => !seen.has(p.id))
  return [...kept, ...added]
}

/** Re-apply a saved id list; anything new is appended in `rest` order. */
export function applySavedOrder<T extends { id: string }>(list: T[], ids: string[]): T[] {
  const byId = new Map(list.map((p) => [p.id, p]))
  const ordered: T[] = []
  for (const id of ids) {
    const p = byId.get(id)
    if (p) {
      ordered.push(p)
      byId.delete(id)
    }
  }
  return [...ordered, ...byId.values()]
}
