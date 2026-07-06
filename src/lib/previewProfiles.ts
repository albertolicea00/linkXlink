import { supabase } from './supabase'
import appConfig from '../config/app-config.json'
import { getDevFlags } from './devFlags'
import type { Profile } from '../types'

/**
 * Teaser profiles for signed-out (or profile-less) visitors, via the
 * `preview_profiles` RPC. The RPC omits whatsapp on purpose — preview cards
 * render with the WhatsApp button disabled (contacting requires an account).
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

  const { data, error } = await supabase.rpc('preview_profiles', {
    p_limit: appConfig.preview_profiles_count,
    p_test_mode: dev.showFakes,
  })
  if (error || !data) return []
  return (data as Omit<Profile, 'whatsapp' | 'active' | 'report_count' | 'disabled_at'>[]).map(
    (p) => ({
      ...p,
      whatsapp: '',
      active: true,
      report_count: 0,
      disabled_at: null,
    }),
  )
}
