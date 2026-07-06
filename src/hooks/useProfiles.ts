import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import appConfig from '../config/app-config.json'
import { getDevFlags } from '../lib/devFlags'
import type { Profile } from '../types'

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfiles = useCallback(async () => {
    const dev = getDevFlags()

    if (
      !dev.bypassRelease &&
      appConfig.first_release_date &&
      new Date() < new Date(appConfig.first_release_date)
    ) {
      setProfiles([])
      setLoading(false)
      return
    }

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
      setError(error.message)
    } else {
      setProfiles((data ?? []) as Profile[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchProfiles()
  }, [fetchProfiles])

  return { profiles, loading, error, refetch: fetchProfiles }
}
