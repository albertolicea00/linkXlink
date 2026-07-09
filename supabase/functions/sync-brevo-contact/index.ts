// Supabase Edge Function: upserts a profile as a Brevo contact on the email
// broadcast list.
//
// Trigger: a Database Webhook on public.profiles (INSERT + UPDATE) — configure
// in Supabase Dashboard → Database → Webhooks. See SETUP.md "Brevo email
// sync" for exact steps. Not client-triggered on purpose: the Brevo API key
// must never reach the browser bundle.
//
// Marketing consent is currently BUNDLED into the mandatory terms checkbox at
// account creation (see AuthPanel.tsx / landing.acceptTerms) — every user who
// completes a profile has already agreed to receive email updates, so this
// syncs unconditionally on every insert/update. If that ever changes to a
// separate opt-in (see the commented block in AuthPanel.tsx), gate this on a
// `profiles.marketing_opt_in` column instead.
//
// Required secrets (`supabase secrets set …`):
//   BREVO_API_KEY               — Brevo API key (Settings → SMTP & API)
//   BREVO_LIST_ID               — numeric id of the target Brevo contact list
// Auto-provided by the platform:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ProfilesWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: {
    id: string
    owner_id: string | null
    name: string
    whatsapp: string
    region: string | null
  } | null
}

Deno.serve(async (req) => {
  let payload: ProfilesWebhookPayload
  try {
    payload = await req.json()
  } catch {
    return new Response('invalid payload', { status: 400 })
  }

  const profile = payload.record
  if (!profile?.owner_id) {
    // Seed/migrated rows are ownerless until claimed — nothing to sync yet.
    return new Response('no owner_id, skipping', { status: 200 })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // profiles has no email column — resolve it from the owning auth.users row.
  const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.getUserById(
    profile.owner_id,
  )
  if (userErr || !userRes?.user?.email) {
    return new Response('could not resolve email, skipping', { status: 200 })
  }

  const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'api-key': Deno.env.get('BREVO_API_KEY')!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: userRes.user.email,
      attributes: {
        NAME: profile.name,
        WHATSAPP: profile.whatsapp,
        REGION: profile.region ?? '',
      },
      listIds: [Number(Deno.env.get('BREVO_LIST_ID'))],
      updateEnabled: true, // upsert — safe to call on every insert/update
    }),
  })

  if (!brevoRes.ok) {
    const text = await brevoRes.text()
    console.error('Brevo sync failed:', brevoRes.status, text)
    return new Response('brevo error', { status: 502 })
  }

  return new Response('ok', { status: 200 })
})
