-- Region field + let users edit photos and region on their own profile.
--   region: free-text state/province. The COUNTRY is derived from the phone
--     number's country code (E.164), so region only stores the sub-national
--     part ("Havana", "Santiago", "Madrid", …) — no per-country list needed.
--   Self-edit now also covers photos and region. Replacing a photo is a direct
--     change (no re-moderation) for now; revisit if abuse shows up.

alter table public.profiles
  add column if not exists region text check (char_length(region) <= 80);

-- ------------------------------------------------------------
-- update_own_profile: add p_region and p_photos to the whitelist.
-- Signature changes, so drop the old one first (CREATE OR REPLACE cannot add
-- parameters without creating a confusing overload).
-- ------------------------------------------------------------
drop function if exists public.update_own_profile(
  text, text, text, text, jsonb, boolean, timestamptz, boolean
);

create or replace function public.update_own_profile(
  p_name text default null,
  p_description text default null,
  p_gender text default null,
  p_interested_in text default null,
  p_interests jsonb default null,
  p_self_hidden boolean default null,
  p_hidden_until timestamptz default null,
  p_clear_hidden_until boolean default false,
  p_region text default null,
  p_photos jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set
    name = coalesce(p_name, name),
    description = coalesce(p_description, description),
    gender = coalesce(p_gender, gender),
    interested_in = coalesce(p_interested_in, interested_in),
    interests = coalesce(p_interests, interests),
    region = coalesce(p_region, region),
    photos = coalesce(p_photos, photos),
    self_hidden = coalesce(p_self_hidden, self_hidden),
    hidden_until = case
      when p_clear_hidden_until then null
      else coalesce(p_hidden_until, hidden_until)
    end
  where owner_id = auth.uid();
end;
$$;

grant execute on function public.update_own_profile(
  text, text, text, text, jsonb, boolean, timestamptz, boolean, text, jsonb
) to authenticated;

-- ------------------------------------------------------------
-- claim_migrated_profile: also apply the submitted region on claim.
-- ------------------------------------------------------------
drop function if exists public.claim_migrated_profile(
  text, text, text, jsonb, date, text, text, jsonb
);

create or replace function public.claim_migrated_profile(
  p_whatsapp text,
  p_name text default null,
  p_description text default null,
  p_photos jsonb default null,
  p_birthdate date default null,
  p_gender text default null,
  p_interested_in text default null,
  p_interests jsonb default null,
  p_region text default null
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
    interests = coalesce(p_interests, interests),
    region = coalesce(p_region, region)
  where id = v_id;

  return jsonb_build_object('claimed', true, 'profile_id', v_id);
end;
$$;

grant execute on function public.claim_migrated_profile(
  text, text, text, jsonb, date, text, text, jsonb, text
) to authenticated;
