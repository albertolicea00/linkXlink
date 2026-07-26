import devConfig from '../config/dev-config.json'
import demoAdmin from '../mocks/demo-admin.json'
import demoModerator from '../mocks/demo-moderator.json'
import demoUser from '../mocks/demo-user.json'
import mockData from '../mocks/demo-data.json'

const DEMO_USERS: Record<string, { profile: any, email: string }> = {
  'admin@demo.com': { profile: demoAdmin, email: 'admin@demo.com' },
  'moderator@demo.com': { profile: demoModerator, email: 'moderator@demo.com' },
  'user@demo.com': { profile: demoUser, email: 'user@demo.com' },
}

const DEMO_IDS: Record<string, string> = {
  'demo-admin-id': 'admin@demo.com',
  'demo-moderator-id': 'moderator@demo.com',
  'demo-user-id': 'user@demo.com',
}

/** True when this user id belongs to a demo account (used by the demo banner). */
export function isDemoUserId(id: string | null | undefined): boolean {
  return !!id && !!DEMO_IDS[id] && isDemoEnabled(id)
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Answer a PostgREST list query over a fixed set of rows: applies the
 * `id=eq.<x>` filter when present, and honors `.single()` (which DOES send
 * `Accept: application/vnd.pgrst.object+json`) by returning one object or a
 * 406/PGRST116. `.maybeSingle()` needs no special case — postgrest-js asks for
 * a plain array and unwraps it client-side.
 */
function jsonList(
  url: string,
  init: RequestInit | undefined,
  rows: Array<{ id: string } & Record<string, unknown>>,
): Response {
  let out = rows
  const idFilter = new URL(url).searchParams.get('id')
  if (idFilter?.startsWith('eq.')) {
    const wanted = idFilter.slice(3)
    out = rows.filter((r) => r.id === wanted)
  }

  const wantsObject = init?.headers
    ? new Headers(init.headers).get('Accept')?.includes('application/vnd.pgrst.object+json')
    : false

  if (wantsObject) {
    if (out.length === 1) return json(out[0])
    return json(
      {
        code: 'PGRST116',
        details: `Results contain ${out.length} rows, application/vnd.pgrst.object+json requires 1 row`,
        hint: null,
        message: 'JSON object requested, multiple (or no) rows returned',
      },
      406,
    )
  }
  return json(out)
}

function isDemoEnabled(emailOrId: string): boolean {
  const email = DEMO_IDS[emailOrId] || emailOrId
  if (email === 'admin@demo.com' && devConfig.demo_admin) return true
  if (email === 'moderator@demo.com' && devConfig.demo_moderator) return true
  if (email === 'user@demo.com' && devConfig.demo_user) return true
  return false
}

/** The `user` object gotrue expects in a token/user response. */
function demoAuthUser(demoData: { profile: any, email: string }) {
  return {
    id: demoData.profile.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: demoData.email,
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: demoData.profile.created_at,
    updated_at: demoData.profile.created_at,
  }
}

// Generate a fake JWT for the demo user
function generateFakeJwt(userId: string) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({ sub: userId, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 * 24 }))
  return `${header}.${payload}.fakedsignature`
}

export async function customFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const method = init?.method || (input instanceof Request ? input.method : 'GET')

  // 1. Intercept Auth Login
  if (url.includes('/auth/v1/token?grant_type=password') && method === 'POST') {
    const body = JSON.parse(init?.body as string || '{}')
    if (DEMO_USERS[body.email] && isDemoEnabled(body.email)) {
      const demoData = DEMO_USERS[body.email]
      // The refresh token carries the user id so a later refresh can rebuild
      // the same session without a lookup table.
      return json({
        access_token: generateFakeJwt(demoData.profile.id),
        token_type: 'bearer',
        expires_in: 3600 * 24,
        refresh_token: `fake-refresh-token:${demoData.profile.id}`,
        user: demoAuthUser(demoData),
      })
    }
  }

  // Token refresh. supabase-js refreshes on its own schedule (session restore,
  // tab focus, the autoRefresh tick), and the demo refresh_token is not real —
  // without this the request escapes to the actual Supabase host, fails, and
  // gotrue signs the demo user out mid-session. Hand back a fresh fake token.
  if (url.includes('/auth/v1/token?grant_type=refresh_token') && method === 'POST') {
    let body: { refresh_token?: string } = {}
    try {
      body = JSON.parse((init?.body as string) || '{}')
    } catch {
      // non-JSON body → not our demo refresh
    }
    if (body.refresh_token?.startsWith('fake-refresh-token')) {
      const id = body.refresh_token.slice('fake-refresh-token:'.length) || 'demo-user-id'
      if (isDemoEnabled(id)) {
        const demoData = DEMO_USERS[DEMO_IDS[id]]
        return json({
          access_token: generateFakeJwt(id),
          token_type: 'bearer',
          expires_in: 3600 * 24,
          refresh_token: `fake-refresh-token:${id}`,
          user: demoAuthUser(demoData),
        })
      }
    }
  }

  // Intercepting Auth User (when restoring session)
  if (url.includes('/auth/v1/user') && method === 'GET') {
    const authHeader = init?.headers ? new Headers(init.headers).get('Authorization') : null
    if (authHeader && authHeader.includes('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (DEMO_IDS[payload.sub] && isDemoEnabled(payload.sub)) {
          return json(demoAuthUser(DEMO_USERS[DEMO_IDS[payload.sub]]))
        }
      } catch (e) {
        // Not a demo token or invalid token
      }
    }
  }

  // Parse the token for subsequent requests
  let isDemoRequest = false
  let demoId = ''
  
  const authHeader = init?.headers ? new Headers(init.headers).get('Authorization') : null
  if (authHeader && authHeader.includes('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (DEMO_IDS[payload.sub] && isDemoEnabled(payload.sub)) {
        isDemoRequest = true
        demoId = payload.sub
      }
    } catch (e) {}
  }

    if (isDemoRequest) {
    // 2. Intercept Staff Roles & Lists
    // NOTE on .maybeSingle(): postgrest-js >= 2.x does NOT send
    // `Accept: application/vnd.pgrst.object+json` for it — it asks for a normal
    // array and unwraps client-side (0 rows → null, 1 row → the object). Only
    // .single() sets that header. So a role lookup arrives here looking like any
    // other list query, and the ONLY thing distinguishing "is this user staff?"
    // is the `id=eq.<uid>` filter in the URL. Ignore it and every demo user
    // reads back as staff.
    if (url.includes('/rest/v1/admins')) {
      return jsonList(url, init, [{ id: 'demo-admin-id', email: 'admin@demo.com' }])
    }

    if (url.includes('/rest/v1/moderators')) {
      return jsonList(url, init, [{ id: 'demo-moderator-id', email: 'moderator@demo.com' }])
    }

    // 3. Intercept RPC calls
    if (url.includes('/rest/v1/rpc/admin_stats')) {
      // Shape must match AdminStats in lib/moderators.ts.
      return json({
        fake: 0,
        migrated: 0,
        migratedUnclaimed: 0,
        noProfile: 4,
        totalUsers: mockData.length + 3,
      })
    }
    if (url.includes('/rest/v1/rpc/my_approved_count')) return json(15)
    if (url.includes('/rest/v1/rpc/my_denied_count')) return json(5)
    if (url.includes('/rest/v1/rpc/search_users')) return json([])
    // Every moderation vote "lands" — the demo has no server to persist to.
    // Shape must match ModerationResult in lib/metrics.ts.
    if (url.includes('/rest/v1/rpc/moderate_profile')) {
      return json({ applied: true, votes: 1, quorum: 1, deleted: false })
    }

    // 4. Intercept Profiles
    if (url.includes('/rest/v1/profiles')) {
      const demoData = DEMO_USERS[DEMO_IDS[demoId]]
      const isObject = init?.headers ? new Headers(init.headers).get('Accept')?.includes('application/vnd.pgrst.object+json') : false;
      
      if (method === 'GET' && url.includes(`owner_id=eq.${demoId}`)) {
        if (isObject) {
          return new Response(JSON.stringify(demoData.profile), { status: 200 })
        }
        return new Response(JSON.stringify([demoData.profile]), { status: 200 })
      }
      if (method === 'GET') {
         let results = [...mockData, demoData.profile]
         
         // Basic filtering for Supabase query params
         if (url.includes('active=eq.true')) {
           results = results.filter(p => p.active === true)
         }
         if (url.includes('active=eq.false')) {
           results = results.filter(p => p.active === false)
         }
         
         const urlObj = new URL(url)
         const isFakeParam = urlObj.searchParams.get('is_fake')
         if (isFakeParam === 'eq.true') results = results.filter(p => p.is_fake === true)
         if (isFakeParam === 'eq.false') results = results.filter(p => p.is_fake === false)
         
         const prefer = init?.headers ? new Headers(init.headers).get('Prefer') : null
         if (prefer && prefer.includes('return=representation')) {
           // Single result (usually a POST/PATCH return)
           return new Response(JSON.stringify(demoData.profile), { status: 200 })
         } else if (url.includes('limit=1') || url.includes('limit=')) {
           // For simplicity, we just return the array
            return new Response(JSON.stringify(results), { status: 200 })
         }
         
         return new Response(JSON.stringify(results), { status: 200 })
      }
      if (method === 'POST' || method === 'PATCH') {
        // Return success for updates/inserts to pretend we saved
        return new Response(JSON.stringify(demoData.profile), { status: 200 })
      }
    }

    // Intercept any other endpoints to prevent errors on demo users
    if (url.includes('/rest/v1/')) {
       // Return empty array for any other data fetch
       if (method === 'GET') return new Response(JSON.stringify([]), { status: 200 })
       if (method === 'POST') return new Response(JSON.stringify({}), { status: 201 })
       if (method === 'PATCH' || method === 'DELETE') return new Response(null, { status: 204 })
    }
  }

  // Fallback to real fetch for non-demo users or endpoints not mocked
  return fetch(input, init)
}
