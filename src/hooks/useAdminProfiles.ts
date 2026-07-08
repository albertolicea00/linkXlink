import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getDevFlags } from '../lib/devFlags'
import type { Profile } from '../types'

const isPending = (p: Profile) => !p.active && p.report_count === 0 && !p.denied_at

/**
 * Shared profiles + derived counts for both the admin and moderator dashboards.
 * `profiles` updates live (patched in place by moderation actions) so stats
 * stay accurate; `modQueue` is a frozen snapshot taken once per `reload()` so
 * the moderation deck doesn't reorder or reappear cards mid-session.
 */
export function useAdminProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [modQueue, setModQueue] = useState<Profile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)

  const reload = async () => {
    setLoadingProfiles(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_fake', getDevFlags().showFakes)
      .order('created_at', { ascending: false })
    const list = (data ?? []) as Profile[]
    setProfiles(list)
    setModQueue(list.filter(isPending))
    setLoadingProfiles(false)
  }

  useEffect(() => {
    void reload()
  }, [])

  const total = profiles.length
  const pending = profiles.filter(isPending).length
  const active = profiles.filter((p) => p.active).length
  const banned = profiles.filter((p) => !p.active && (p.report_count > 0 || p.denied_at)).length

  return { profiles, setProfiles, modQueue, loadingProfiles, reload, total, pending, active, banned }
}
