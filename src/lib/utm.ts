/** Appends UTM params to an outbound link so its origin is trackable in analytics. */
export function withUtm(url: string, campaign: string): string {
  if (!url) return url
  try {
    const u = new URL(url)
    u.searchParams.set('utm_source', 'app')
    u.searchParams.set('utm_medium', 'referral')
    u.searchParams.set('utm_campaign', campaign)
    return u.toString()
  } catch {
    return url
  }
}
