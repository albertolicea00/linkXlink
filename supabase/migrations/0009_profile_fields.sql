-- Richer profiles + user self-management.
--   gender: what the person is
--   interested_in: who they want to see (NOT filtered yet — future feature)
--   birthdate: now STORED to display age (feed is member-gated by 0006, so
--     it is not world-readable; still, exact DOB is sensitive — the UI shows
--     age, never the raw date, to other users)
--   interests: free tags, chosen from a default list or custom
--   self_hidden / hidden_until: user-controlled visibility
--     self_hidden = true       → "don't show me anymore"
--     hidden_until = <future>  → hidden until that date, then reappears

alter table public.profiles
  add column if not exists gender text check (gender in ('male', 'female', 'other')),
  add column if not exists interested_in text check (interested_in in ('male', 'female', 'both')),
  add column if not exists birthdate date,
  add column if not exists interests jsonb not null default '[]'::jsonb,
  add column if not exists self_hidden boolean not null default false,
  add column if not exists hidden_until timestamptz;

-- Feed visibility now also respects the user's own hide/pause settings.
drop policy if exists "members read active profiles" on public.profiles;
create policy "members read active profiles"
  on public.profiles for select
  using (
    (
      active = true
      and self_hidden = false
      and (hidden_until is null or hidden_until <= now())
      and auth.uid() is not null
      and public.has_own_profile()
    )
    or public.is_moderator()
  );

-- Self-service edit: whitelisted columns only, always the caller's own row.
-- Deliberately cannot touch active / report_count / owner_id / whatsapp /
-- photos / birthdate — so a user can never self-approve or spoof ownership.
create or replace function public.update_own_profile(
  p_name text default null,
  p_description text default null,
  p_gender text default null,
  p_interested_in text default null,
  p_interests jsonb default null,
  p_self_hidden boolean default null,
  p_hidden_until timestamptz default null,
  p_clear_hidden_until boolean default false
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
    self_hidden = coalesce(p_self_hidden, self_hidden),
    hidden_until = case
      when p_clear_hidden_until then null
      else coalesce(p_hidden_until, hidden_until)
    end
  where owner_id = auth.uid();
end;
$$;

grant execute on function public.update_own_profile(
  text, text, text, text, jsonb, boolean, timestamptz, boolean
) to authenticated;

-- Preview also respects hide/pause. Return type grows (new columns), so the
-- old function from 0007 must be dropped first — CREATE OR REPLACE can't
-- change a function's return type.
drop function if exists public.preview_profiles(integer);
create or replace function public.preview_profiles(p_limit integer default 3)
returns table (
  id uuid,
  name text,
  description text,
  photos jsonb,
  birthdate date,
  gender text,
  interests jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name, p.description, p.photos, p.birthdate, p.gender, p.interests, p.created_at
  from public.profiles p
  where p.active = true
    and p.self_hidden = false
    and (p.hidden_until is null or p.hidden_until <= now())
  order by random()
  limit least(greatest(coalesce(p_limit, 3), 0), 10);
$$;

grant execute on function public.preview_profiles(integer) to anon, authenticated;
