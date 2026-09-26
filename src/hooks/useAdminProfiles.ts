import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getDevFlags } from '../lib/devFlags'
import { idbGetAll, idbReplaceAll } from '../lib/idb'
import { mergeKeepingOrder } from '../lib/deckSession'
import type { Profile } from '../types'

const CACHE_STORE = 'mod-profiles-cache'

const isPending = (p: Profile) => !p.active && p.report_count === 0 && !p.denied_at

/**
 * Shared profiles + derived counts for both the admin and moderator dashboards.
 * `profiles` updates live (patched in place by moderation actions) so stats
 * stay accurate; `modQueue` keeps its existing order across silent reloads so
 * the deck doesn't jump back to the first card.
 */
export function useAdminProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [modQueue, setModQueue] = useState<Profile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const profilesRef = useRef(profiles)
  profilesRef.current = profiles

  const reload = useCallback(async () => {
    const silent = profilesRef.current.length > 0
    if (!silent) setLoadingProfiles(true)
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
    if (list.length > 0 || profilesRef.current.length === 0) {
      setProfiles(list)
      const pendingList = list.filter(isPending)
      setModQueue((prev) => (prev.length === 0 ? pendingList : mergeKeepingOrder(prev, pendingList)))
      if (list.length > 0) void idbReplaceAll(CACHE_STORE, list)
    }
    setLoadingProfiles(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    void idbGetAll<Profile>(CACHE_STORE).then((cached) => {
      if (cancelled || cached.length === 0) return
      setProfiles((prev) => (prev.length > 0 ? prev : cached))
      setModQueue((prev) => (prev.length > 0 ? prev : cached.filter(isPending)))
      setLoadingProfiles(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const total = profiles.length
  const pending = profiles.filter(isPending).length
  const active = profiles.filter((p) => p.active).length
  const banned = profiles.filter((p) => !p.active && (p.report_count > 0 || p.denied_at)).length

  return { profiles, setProfiles, modQueue, loadingProfiles, reload, total, pending, active, banned }
}
