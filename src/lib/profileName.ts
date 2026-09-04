// Bulk-imported migrated profiles were inserted with placeholder names like
// "Usuario 97324" (literal word + digits). Real names never match
// this shape, so it's safe to detect and hide instead of relying on a DB
// migration to backfill every historical row.
const PLACEHOLDER_NAME_RE = /^usuario\s+\d+$/i

export function isPlaceholderName(name: string): boolean {
  return PLACEHOLDER_NAME_RE.test(name.trim())
}

export function displayName(name: string): string {
  return isPlaceholderName(name) ? '' : name
}
