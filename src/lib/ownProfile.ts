import { supabase } from './supabase'
import type { Profile } from '../types'

export interface OwnProfileResult {
  profile: Profile | null
  /**
   * true when the READ itself failed (network / RLS / token not ready) — which
   * is NOT the same as "no profile". Callers must not treat an errored read as
   * "profile missing", or a transient failure locks the user behind the gate.
   */
  error: boolean
}

/**
 * The signed-in user's own profile (RLS lets owners read theirs even while
 * pending). Pass the known user id to skip the extra getUser() round-trip
 * (avoids a login-time race where the query fires before the token settles).
 */
export async function fetchOwnProfile(userId?: string): Promise<OwnProfileResult> {
  let uid = userId
  if (!uid) {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return { profile: null, error: false }
    uid = auth.user.id
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('owner_id', uid)
    .maybeSingle()
  if (error) return { profile: null, error: true }
  return { profile: (data as Profile | null) ?? null, error: false }
}
