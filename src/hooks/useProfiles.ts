import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import appConfig from '../config/app-config.json'
import type { Profile } from '../types'

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const CACHE_KEY = 'cache_feedProfiles'

  const fetchProfiles = useCallback(async () => {
    if (appConfig.first_release_date && new Date() < new Date(appConfig.first_release_date)) {
      setProfiles([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('active', true)
      .eq('is_fake', appConfig.test_mode)
      .order('created_at', { ascending: false })

    if (error) {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        try {
          setProfiles(JSON.parse(cached) as Profile[])
          setLoading(false)
          return
        } catch {
          // ignore parse errors and fallback to error state
        }
      }
      setError(error.message)
    } else {
      const fetchedProfiles = (data ?? []) as Profile[]
      setProfiles(fetchedProfiles)
      localStorage.setItem(CACHE_KEY, JSON.stringify(fetchedProfiles))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchProfiles()
  }, [fetchProfiles])

  return { profiles, loading, error, refetch: fetchProfiles }
}
