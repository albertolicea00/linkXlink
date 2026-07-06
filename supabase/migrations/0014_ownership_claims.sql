-- Ownership claims ("this profile is mine").
--   When a user registers with a WhatsApp number that already belongs to an
--   OWNED profile (not a claimable seed row), they cannot take it over. They
--   may instead file an ownership claim for a moderator to review. This only
--   records the claim — no automatic reassignment (deliberate).
--
--   Separate from `reports` on purpose: a report increments report_count and
--   can auto-disable a profile at threshold; an ownership claim must not.

create table if not exists public.ownership_claims (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  claimant_id uuid not null references auth.users (id) on delete cascade,
  note text check (char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'resolved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists ownership_claims_profile_idx
  on public.ownership_claims (profile_id);

-- One open claim per claimant per profile.
create unique index if not exists ownership_claims_claimant_unique
  on public.ownership_claims (profile_id, claimant_id);

alter table public.ownership_claims enable row level security;

create policy "users insert own ownership claim"
  on public.ownership_claims for insert
  with check (auth.uid() is not null and claimant_id = auth.uid());

create policy "read own or moderator ownership claims"
  on public.ownership_claims for select
  using (claimant_id = auth.uid() or public.is_moderator());

create policy "moderators update ownership claims"
  on public.ownership_claims for update
  using (public.is_moderator());

-- ------------------------------------------------------------
-- RPC: claim_ownership — file a claim by phone number
-- ------------------------------------------------------------
-- The claimant has no profile yet, so the feed RLS hides the target row from
-- them; they only know the phone number. This looks the profile up server-side
-- (security definer) and files the claim. Idempotent via the unique index.
create or replace function public.claim_ownership(
  p_whatsapp text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select id into v_id
  from public.profiles
  where whatsapp = p_whatsapp and owner_id is not null
  limit 1;

  if v_id is null then
    return jsonb_build_object('filed', false);
  end if;

  insert into public.ownership_claims (profile_id, claimant_id, note)
  values (v_id, v_uid, p_note)
  on conflict (profile_id, claimant_id) do nothing;

  return jsonb_build_object('filed', true);
end;
$$;

grant execute on function public.claim_ownership(text, text) to authenticated;
