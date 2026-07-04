import appConfig from '../config/app-config.json'

/**
 * Local rotation: per-device view counters so the deck shows least-seen
 * profiles first instead of the same people in the same order for everyone.
 * Server-side popularity balancing is future work.
 */
const STORAGE_KEY = 'lxl_seen_profiles'

type SeenMap = Record<string, number>

function load(): SeenMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as SeenMap
  } catch {
    return {}
  }
}

export function markSeen(profileId: string): void {
  try {
    const map = load()
    map[profileId] = (map[profileId] ?? 0) + 1
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // storage unavailable — rotation degrades to plain shuffle
  }
}

/**
 * Shuffled order, unique per device/session. With rotation enabled,
 * profiles this device has seen fewer times come first.
 */
export function orderProfiles<T extends { id: string }>(profiles: T[]): T[] {
  const seen = load()
  const random = new Map(profiles.map((p) => [p.id, Math.random()]))
  return [...profiles].sort((a, b) => {
    if (appConfig.rotation_least_seen_first) {
      const diff = (seen[a.id] ?? 0) - (seen[b.id] ?? 0)
      if (diff !== 0) return diff
    }
    return random.get(a.id)! - random.get(b.id)!
  })
}
