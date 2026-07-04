import { supabase } from './supabase'
import appConfig from '../config/app-config.json'

/**
 * Anonymous usage metrics (profile_events table) and moderation audit trail
 * (moderation_actions table). Event inserts are fire-and-forget: metrics
 * must never break or slow down the UI, and they silently no-op offline.
 */
const DEVICE_KEY = 'lxl_device_id'

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
  void supabase
    .from('profile_events')
    .insert({ profile_id: profileId, event, device_id: getDeviceId() })
    .then(
      () => undefined,
      () => undefined,
    )
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
