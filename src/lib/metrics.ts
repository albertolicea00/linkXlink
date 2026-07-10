import { supabase } from './supabase'
import appConfig from '../config/app-config.json'
import { idbAdd, idbGetAll, idbClear } from './idb'

/**
 * Anonymous usage metrics (profile_events table) and moderation audit trail
 * (moderation_actions table). Event inserts are fire-and-forget: metrics
 * must never break or slow down the UI. Ones that fail (offline, flaky
 * network) queue in IndexedDB and flush automatically on reconnect — see
 * `flushPendingEvents` / the `online` listener wired in main.tsx.
 */
const DEVICE_KEY = 'lxl_device_id'
const PENDING_STORE = 'pending-events'

interface PendingEvent {
  profile_id: string
  event: ProfileEvent
  device_id: string
}

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return 'unknown'
  }
}

export type ProfileEvent = 'view' | 'whatsapp_click'

const EVENT_ENABLED: Record<ProfileEvent, boolean> = {
  view: appConfig.track_views,
  whatsapp_click: appConfig.track_whatsapp_clicks,
}

export function trackProfileEvent(profileId: string, event: ProfileEvent): void {
  if (!EVENT_ENABLED[event]) return
  const payload: PendingEvent = { profile_id: profileId, event, device_id: getDeviceId() }
  void supabase
    .from('profile_events')
    .insert(payload)
    .then(
      () => undefined,
      // Offline or the request otherwise failed — queue it instead of losing
      // it outright; flushPendingEvents() retries on reconnect.
      () => void idbAdd(PENDING_STORE, payload),
    )
}

/**
 * Retries every queued profile_events row, then clears the queue regardless
 * of individual failures (best-effort metrics — a stale event isn't worth
 * holding onto forever). Wired to the `online` window event in main.tsx.
 *
 * This is a pragmatic app-level retry, NOT the Background Sync API: true
 * background sync (via a service worker `sync` event) would also flush
 * queued events if the user closes the tab before reconnecting, but requires
 * switching vite-plugin-pwa from `generateSW` to `injectManifest` with a
 * custom service worker — a bigger, riskier change. This covers the common
 * case (still has the tab open when connectivity returns) with far less risk.
 */
export async function flushPendingEvents(): Promise<void> {
  const pending = await idbGetAll<PendingEvent>(PENDING_STORE)
  if (pending.length === 0) return
  await Promise.allSettled(
    pending.map((p) =>
      supabase
        .from('profile_events')
        .insert({ profile_id: p.profile_id, event: p.event, device_id: p.device_id }),
    ),
  )
  await idbClear(PENDING_STORE)
}

export type ModerationAction = 'approve' | 'skip' | 'ban' | 'reactivate'

/** Requires an authenticated admin session (RLS enforces moderator_id = auth.uid()). */
export async function logModeration(profileId: string, action: ModerationAction): Promise<void> {
  const { data } = await supabase.auth.getUser()
  if (!data.user) return
  await supabase
    .from('moderation_actions')
    .insert({ profile_id: profileId, moderator_id: data.user.id, action })
}

export interface ModerationResult {
  /** true when the vote reached quorum (or the caller is an admin) and the
   *  profile state actually changed. */
  applied: boolean
  votes: number
  quorum: number
  /** true when a denied UNCLAIMED migrated (seed) profile was deleted outright
   *  instead of soft-denied — it has no real registrant, so the row is gone,
   *  not just deactivated (migration 0017). */
  deleted: boolean
}

/**
 * Quorum-aware moderation (migration 0012). Records the caller's vote and, once
 * an admin votes or `quorum` distinct moderators agree, flips the profile:
 *   approve → active; deny → disabled (denied_at set), UNLESS the profile is an
 *   unclaimed migrated seed row, which is deleted instead (see `deleted`).
 *   skip only logs. `reason` is required (free text) for deny. Returns null on
 * RPC error.
 */
export async function moderateProfile(
  profileId: string,
  action: 'approve' | 'deny' | 'skip',
  reason?: string,
): Promise<ModerationResult | null> {
  const { data, error } = await supabase.rpc('moderate_profile', {
    p_profile_id: profileId,
    p_action: action,
    p_reason: reason ?? null,
  })
  if (error) return null
  return data as ModerationResult
}
