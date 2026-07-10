import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { fetchStaffRole, type StaffRole } from '../lib/staffRole'
import { fetchOwnProfile } from '../lib/ownProfile'

interface NavState {
  session: ReturnType<typeof useAuth>['session']
  role: StaffRole
  hasProfile: boolean
  loading: boolean
}

const NavContext = createContext<NavState>({
  session: null,
  role: null,
  hasProfile: false,
  loading: true,
})

/**
 * Session + staff role + has-profile, fetched ONCE and shared across the
 * whole app. Lives above the router so navigating between pages (or flipping
 * the admin view) never remounts it — the nav bar stays put, no re-fetch,
 * no flicker.
 */
export function NavStateProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth()
  const [role, setRole] = useState<StaffRole>(null)
  const [hasProfile, setHasProfile] = useState(false)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    if (!session) {
      setRole(null)
      setHasProfile(false)
      setResolved(true)
      return
    }
    let cancelled = false
    setResolved(false)
    void Promise.all([fetchStaffRole(), fetchOwnProfile(session.user.id)]).then(([r, p]) => {
      if (cancelled) return
      setRole(r)
      setHasProfile(!!p.profile)
      setResolved(true)
    })
    return () => {
      cancelled = true
    }
  }, [session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <NavContext.Provider
      value={{ session, role, hasProfile, loading: authLoading || !resolved }}
    >
      {children}
    </NavContext.Provider>
  )
}

export function useNav(): NavState {
  return useContext(NavContext)
}
