import { supabase } from './supabase'

export type StaffRole = 'admin' | 'moderator' | null

/**
 * Role of the signed-in user for the admin panel. Regular users (who now
 * share the same Supabase Auth) get null — RLS already blocks their reads,
 * this is what keeps the panel UI shut for them too.
 */
export async function fetchStaffRole(): Promise<StaffRole> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const [{ data: admin }, { data: moderator }] = await Promise.all([
    supabase.from('admins').select('id').eq('id', auth.user.id).maybeSingle(),
    supabase.from('moderators').select('id').eq('id', auth.user.id).maybeSingle(),
  ])
  return admin ? 'admin' : moderator ? 'moderator' : null
}
