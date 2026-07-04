import { supabase } from './supabase'
import type { Profile } from '../types'

/**
 * The signed-in user's own profile (RLS lets owners read theirs even while
 * pending). Null when signed out or no profile created yet.
 */
export async function fetchOwnProfile(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('owner_id', auth.user.id)
    .maybeSingle()
  return (data as Profile | null) ?? null
}
