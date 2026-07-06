import { supabase } from './supabase'
import type { Profile } from '../types'

/**
 * The signed-in user's own profile (RLS lets owners read theirs even while
 * pending). Null when signed out or no profile created yet.
 */
export async function fetchOwnProfile(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null

  const cacheKey = `cache_ownProfile_${auth.user.id}`
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('owner_id', auth.user.id)
    .maybeSingle()

  if (error) {
    // If the network fails, fallback to local cache
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        return JSON.parse(cached) as Profile
      } catch {
        // ignore parse errors
      }
    }
    return null
  }

  const profile = (data as Profile | null) ?? null
  if (profile) {
    localStorage.setItem(cacheKey, JSON.stringify(profile))
  } else {
    localStorage.removeItem(cacheKey)
  }
  
  return profile
}
