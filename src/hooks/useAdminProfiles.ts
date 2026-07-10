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
    // PostgREST caps a single response at 1000 rows. With more profiles than
    // that the derived counters (total/pending/...) and the moderator deck were
    // silently truncated, so page through every row instead of one bounded read.
    const PAGE = 1000
    const list: Profile[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_fake', getDevFlags().showFakes)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE - 1)
      if (error) break
      const chunk = (data ?? []) as Profile[]
      list.push(...chunk)
      if (chunk.length < PAGE) break
    }
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
