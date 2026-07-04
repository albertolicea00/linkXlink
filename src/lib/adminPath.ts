/**
 * Admin route path from build env so the URL is not visible in the repo.
 * Note: VITE_ vars are inlined into the JS bundle at build time, so the
 * path is still discoverable by inspecting the shipped code — this only
 * hides the door. Real protection remains Supabase Auth + RLS.
 */
export const ADMIN_PATH: string = import.meta.env.VITE_ADMIN_PATH || '/admin'
