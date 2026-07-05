import { supabase } from './supabase'
import type { Gender, InterestedIn } from '../types'

export interface OwnProfileUpdate {
  name?: string
  description?: string
  gender?: Gender
  interested_in?: InterestedIn
  interests?: string[]
  self_hidden?: boolean
  /** ISO timestamp to stay hidden until; pass clearHiddenUntil to unset. */
  hidden_until?: string | null
  clearHiddenUntil?: boolean
}

/**
 * Update the signed-in user's own profile via the whitelisted RPC
 * (`update_own_profile`). The RPC can only reach the caller's row and never
 * touches active/report_count/ownership — so this can't self-approve.
 */
export async function updateOwnProfile(patch: OwnProfileUpdate): Promise<{ error: boolean }> {
  const { error } = await supabase.rpc('update_own_profile', {
    p_name: patch.name ?? null,
    p_description: patch.description ?? null,
    p_gender: patch.gender ?? null,
    p_interested_in: patch.interested_in ?? null,
    p_interests: patch.interests ?? null,
    p_self_hidden: patch.self_hidden ?? null,
    p_hidden_until: patch.hidden_until ?? null,
    p_clear_hidden_until: patch.clearHiddenUntil ?? false,
  })
  return { error: !!error }
}
