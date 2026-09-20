// Supabase Edge Function: health check for uptime monitors.
//
// GET https://<project-ref>.supabase.co/functions/v1/health
// Runs a trivial query against a public table to confirm the DB connection
// is alive, not just that the function runtime is up. Returns 200 with
// {"status":"ok"} on success, 503 with {"status":"error"} otherwise.
//
// No auth required by design (uptime checkers can't hold a service key);
// it touches no sensitive data — just row count on a public table.
//
// Auto-provided by the platform: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { error } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .limit(1)

  if (error) {
    console.error('Health check DB query failed:', error.message)
    return new Response(JSON.stringify({ status: 'error' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
