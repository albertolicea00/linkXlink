import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import appConfig from '../config/app-config.json'
import { getDevFlags } from '../lib/devFlags'
import { idbGetAll, idbReplaceAll } from '../lib/idb'
import type { Profile } from '../types'

const CACHE_STORE = 'profiles-cache'

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // True when what's on screen came from the IndexedDB cache (offline/network
  // failure) rather than a fresh fetch — lets the UI be honest about it.
  const [servingCached, setServingCached] = useState(false)

  const fetchProfiles = useCallback(async () => {
    const dev = getDevFlags()

    setLoading(true)
    setError(null)
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('active', true)
      .eq('is_fake', dev.showFakes)

    if (dev.onlyMigratedUnclaimed) {
      // Dev QA view: unclaimed seed rows only.
      query = query.eq('migrated', true).is('owner_id', null)
    } else if (!appConfig.seed_profiles_visible_before_claim) {
      // Seed ("migrated") rows are live so their owner can claim them, but the
      // feed can be told to hide them until claimed (owner_id set).
      query = query.or('migrated.eq.false,owner_id.not.is.null')
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      // Network/offline failure — fall back to the last successfully fetched
      // feed (IndexedDB), so the app stays usable without a connection.
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
      setProfiles(fetchedProfiles)
      setServingCached(false)
      void idbReplaceAll(CACHE_STORE, fetchedProfiles)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchProfiles()
  }, [fetchProfiles])

  return { profiles, loading, error, servingCached, refetch: fetchProfiles }
}
