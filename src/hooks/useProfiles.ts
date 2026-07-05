import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import appConfig from '../config/app-config.json'
import type { Profile } from '../types'

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('active', true)
      .eq('is_fake', appConfig.test_mode)
      .order('created_at', { ascending: false })

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
