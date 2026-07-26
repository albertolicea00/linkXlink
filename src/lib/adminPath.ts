/**
 * Staff route paths.
 *
 * These are plain, fixed URLs — the old `VITE_ADMIN_PATH` "secret keyword"
 * was dropped: the value shipped inlined in the JS bundle anyway, so it hid
 * the door from casual visitors at the cost of an env var that had to match
 * across every environment. The real boundary always was Supabase Auth + RLS.
 *
 * Admin and moderator are independent routes (they used to be one route split
 * by a `?view=` query), so deep links, nav active state and page titles all
 * key off the URL.
 */

/** Global stats + staff management. Admin only. */
export const ADMIN_PATH = '/admin'
/** Pending queue + approve/deny deck. Moderator or admin. */
export const MODERATOR_PATH = '/admin/moderator'
/** Read-only viewer for the config JSONs. Admin only. */
export const CONFIG_PATH = '/admin/config'
