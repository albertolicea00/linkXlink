-- Seeded ("migrated") profiles + phone-based claim.
--   The launch feed is bootstrapped with real people inserted by hand (see
--   supabase/seed.sql), owner_id NULL, migrated = true. When the actual owner
--   later registers and enters the SAME WhatsApp number, instead of the
--   "number already in use" error they CLAIM the row: owner_id is set to them
--   and their submitted fields overwrite the seed placeholders. The seed row
--   was inserted active, so a claimed profile stays live (no re-approval).
--
--   migrated stays true after a claim — it is provenance, not a pending flag.
--   Whether seed rows show in the feed BEFORE being claimed is a UI decision
--   (app-config.json: seed_profiles_visible_before_claim); the row is active
--   either way, so the toggle is enforced client-side in the feed query.

alter table public.profiles
  add column if not exists migrated boolean not null default false;

-- ------------------------------------------------------------
-- RPC: claim_migrated_profile — assign an ownerless seed row to the caller
-- ------------------------------------------------------------
-- security definer: a normal user cannot UPDATE owner_id via RLS. Only an
-- ownerless, migrated row matching the number can be claimed, and only if the
-- caller does not already own a profile (one profile per account).
create or replace function public.claim_migrated_profile(
  p_whatsapp text,
  p_name text default null,
  p_description text default null,
  p_photos jsonb default null,
  p_birthdate date default null,
  p_gender text default null,
  p_interested_in text default null,
  p_interests jsonb default null
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
  if exists (select 1 from public.profiles where owner_id = v_uid) then
    raise exception 'account already owns a profile' using errcode = '23505';
  end if;

  select id into v_id
  from public.profiles
  where whatsapp = p_whatsapp and migrated = true and owner_id is null
  for update
  limit 1;

  if v_id is null then
    return jsonb_build_object('claimed', false);
  end if;

  update public.profiles set
    owner_id = v_uid,
    name = coalesce(p_name, name),
    description = coalesce(p_description, description),
    photos = coalesce(p_photos, photos),
    birthdate = coalesce(p_birthdate, birthdate),
    gender = coalesce(p_gender, gender),
    interested_in = coalesce(p_interested_in, interested_in),
    interests = coalesce(p_interests, interests)
  where id = v_id;

  return jsonb_build_object('claimed', true, 'profile_id', v_id);
end;
$$;

grant execute on function public.claim_migrated_profile(
  text, text, text, jsonb, date, text, text, jsonb
) to authenticated;
