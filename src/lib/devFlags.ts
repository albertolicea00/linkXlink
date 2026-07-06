/**
 * Per-device developer overrides (localStorage), replacing the old global
 * `test_mode` config flag. Surfaced only to admins in /account.
 *
 * NOT a security boundary: the is_fake filter is applied client-side and RLS
 * returns active profiles regardless of is_fake, so a determined user could
 * flip these in devtools. They exist so devs can QA the app — see fake seed
 * data, bypass the release-date gate, inspect unclaimed migrated rows — without
 * a config change + redeploy. Flags compose: each one that is on adds a
 * constraint to the feed query. All off → the app behaves like it does for
 * everyone else.
 */
export interface DevFlags {
  /** Feed shows fake profiles (is_fake = true) instead of real ones. */
  showFakes: boolean
  /** Ignore first_release_date — feed/preview load before launch. */
  bypassRelease: boolean
  /** Show only migrated seed rows nobody has claimed yet (migrated, owner_id null). */
  onlyMigratedUnclaimed: boolean
}

const KEY = 'lxl_dev_flags'
const DEFAULTS: DevFlags = {
  showFakes: false,
  bypassRelease: false,
  onlyMigratedUnclaimed: false,
}

export function getDevFlags(): DevFlags {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<DevFlags>) }
  } catch {
    return DEFAULTS
  }
}

export function setDevFlags(flags: DevFlags): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(flags))
  } catch {
    // no-op: private mode / storage disabled
  }
}
