import { supabase } from './supabase'
import appConfig from '../config/app-config.json'
import { getDevFlags } from './devFlags'
import type { Profile } from '../types'

const CACHE_KEY = 'lxl_preview_cache'

/**
 * Teaser profiles for signed-out (or profile-less) visitors, via the
 * `preview_profiles` RPC. The RPC omits whatsapp on purpose — preview cards
 * render with the WhatsApp button disabled (contacting requires an account).
 *
 * The RPC picks randomly (`order by random()`), so without caching, every page
 * reload would hand the visitor a fresh random batch — turning the "free
 * trial" of N profiles into an unlimited free browse (just refresh for more).
 * The first batch is cached per device and replayed on every later call, so a
 * given visitor only ever sees the same preview set until they sign up.
 */
export async function fetchPreviewProfiles(): Promise<Profile[]> {
  const dev = getDevFlags()
  if (
    !dev.bypassRelease &&
    appConfig.first_release_date &&
    new Date() < new Date(appConfig.first_release_date)
  ) {
    return []
  }

  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) return JSON.parse(cached) as Profile[]
  } catch {
    // fall through to a fresh fetch
  }

  const { data, error } = await supabase.rpc('preview_profiles', {
    p_limit: appConfig.preview_profiles_count,
    p_test_mode: dev.showFakes,
  })
  if (error || !data) return []
  const profiles = (
    data as Omit<Profile, 'whatsapp' | 'active' | 'report_count' | 'disabled_at'>[]
  ).map((p) => ({
    ...p,
    whatsapp: '',
    active: true,
    report_count: 0,
    disabled_at: null,
  }))

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(profiles))
  } catch {
    // storage unavailable — just won't persist, degrades to the old behavior
  }

  return profiles
}
