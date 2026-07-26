import devConfig from '../config/dev-config.json'

/**
 * Per-device developer overrides (localStorage), replacing the old global
 * `test_mode` config flag. Surfaced only to admins via the floating </> button
 * (DevFlagsFab).
 *
 * The available toggles are declared as a JSON literal in dev-config.json
 * (`dev_flags`: [{ key, labelKey }]). Adding a new toggle = add an entry there
 * + an i18n label + wire its effect where the flag is read. Defaults are
 * derived from that list, so this file never needs editing to add one.
 *
 * `show_dev_settings_to_admins: false` in dev-config.json is the kill switch:
 * the panel disappears AND any stored flags are purged, so a device that had
 * them on falls back to normal behavior on the next read.
 *
 * NOT a security boundary: the is_fake filter is client-side and RLS returns
 * active profiles regardless. All off → the app behaves like for everyone else.
 */
export type DevFlags = Record<string, boolean>

const KEY = 'lxl_dev_flags'

function defaults(): DevFlags {
  const d: DevFlags = {}
  for (const f of devConfig.dev_flags) d[f.key] = false
  return d
}

export function getDevFlags(): DevFlags {
  const base = defaults()
  // Kill switch: flipping `show_dev_settings_to_admins` off must neutralize the
  // flags, not just hide the panel — otherwise whoever had them on keeps a
  // an altered app forever. Purge the stored copy on the way out.
  if (!devConfig.show_dev_settings_to_admins) {
    clearDevFlags()
    return base
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    return { ...base, ...(JSON.parse(raw) as Record<string, boolean>) }
  } catch {
    return base
  }
}

export function clearDevFlags(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // no-op: private mode / storage disabled
  }
}

export function setDevFlags(flags: DevFlags): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(flags))
  } catch {
    // no-op: private mode / storage disabled
  }
}
