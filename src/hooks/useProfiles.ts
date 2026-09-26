import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import devConfig from '../config/dev-config.json'
import { getDevFlags } from '../lib/devFlags'
import { idbGetAll, idbReplaceAll } from '../lib/idb'
import { mergeKeepingOrder } from '../lib/deckSession'
import type { Profile } from '../types'

const CACHE_STORE = 'profiles-cache'

export function useProfiles(authReady: boolean, _userId?: string) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // True when what's on screen came from the IndexedDB cache (offline/network
  // failure) rather than a fresh fetch — lets the UI be honest about it.
  const [servingCached, setServingCached] = useState(false)
  const profilesRef = useRef(profiles)
  profilesRef.current = profiles

  const fetchProfiles = useCallback(async (opts?: { replace?: boolean }) => {
    const replace = opts?.replace === true
    const silent = !replace && profilesRef.current.length > 0
    const dev = getDevFlags()

    if (!silent) setLoading(true)
    setError(null)
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('active', true)
      .eq('is_fake', dev.showFakes)

    if (dev.onlyMigratedUnclaimed) {
      // Dev QA view: unclaimed seed rows only.
      query = query.eq('migrated', true).is('owner_id', null)
    } else if (!devConfig.seed_profiles_visible_before_claim) {
      // Seed ("migrated") rows are live so their owner can claim them, but the
      // feed can be told to hide them until claimed (owner_id set).
      query = query.or('migrated.eq.false,owner_id.not.is.null')
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      // Network/offline failure — fall back to the last successfully fetched
      // feed (IndexedDB), so the app stays usable without a connection.
      if (profilesRef.current.length > 0) {
        setServingCached(true)
        setLoading(false)
        return
      }
      const cached = await idbGetAll<Profile>(CACHE_STORE)
      if (cached.length > 0) {
        setProfiles(cached)
        setServingCached(true)
        setLoading(false)
        return
      }
      setError(error.message)
      setServingCached(false)
    } else {
      const fetchedProfiles = (data ?? []) as Profile[]
      setProfiles((prev) => {
        if (replace || prev.length === 0) return fetchedProfiles
        return mergeKeepingOrder(prev, fetchedProfiles)
      })
      setServingCached(false)
      void idbReplaceAll(CACHE_STORE, fetchedProfiles)
    }
    setLoading(false)
  }, [])

  // Paint the last known feed immediately so a refresh isn't a blank loader.
  useEffect(() => {
    let cancelled = false
    void idbGetAll<Profile>(CACHE_STORE).then((cached) => {
      if (cancelled || cached.length === 0) return
      setProfiles((prev) => (prev.length > 0 ? prev : cached))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Wait until auth has resolved so the first network read sees the session
  // (RLS). Re-run when the signed-in user changes.
  useEffect(() => {
    if (!authReady) return
    void fetchProfiles()
  }, [authReady, _userId, fetchProfiles])

  return { profiles, loading, error, servingCached, refetch: fetchProfiles }
}
