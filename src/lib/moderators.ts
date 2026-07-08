import { supabase } from './supabase'

export interface Moderator {
  id: string
  email: string
  created_at: string
}

export interface UserSearchResult {
  id: string
  email: string
}

/** Admin-only: current moderators (RLS lets admins read the whole list). */
export async function listModerators(): Promise<Moderator[]> {
  const { data } = await supabase
    .from('moderators')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []) as Moderator[]
}

/** Admin-only: search user accounts by email (via `search_users` RPC). */
export async function searchUsers(term: string): Promise<UserSearchResult[]> {
  const { data } = await supabase.rpc('search_users', { p_term: term })
  return (data ?? []) as UserSearchResult[]
}

/** Promote a user to moderator. RLS restricts the insert to admins. */
export async function addModerator(id: string, email: string): Promise<{ error: boolean }> {
  const { error } = await supabase.from('moderators').insert({ id, email })
  return { error: !!error }
}

export async function removeModerator(id: string): Promise<{ error: boolean }> {
  const { error } = await supabase.from('moderators').delete().eq('id', id)
  return { error: !!error }
}

export async function myApprovedCount(): Promise<number> {
  const { data } = await supabase.rpc('my_approved_count')
  return (data as number | null) ?? 0
}

export async function myDeniedCount(): Promise<number> {
  const { data } = await supabase.rpc('my_denied_count')
  return (data as number | null) ?? 0
}

export interface AdminStats {
  fake: number
  migrated: number
  migratedUnclaimed: number
  noProfile: number
}

const EMPTY_ADMIN_STATS: AdminStats = {
  fake: 0,
  migrated: 0,
  migratedUnclaimed: 0,
  noProfile: 0,
}

/**
 * Admin-only global counters (`admin_stats` RPC, migration 0018) — always the
 * true database totals, never filtered by dev flags or the panel's current
 * profiles query.
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc('admin_stats')
  if (error || !data) return EMPTY_ADMIN_STATS
  return data as AdminStats
}
