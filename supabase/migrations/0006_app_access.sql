-- NOTE: migration 0009 replaces the "members read active profiles" policy
-- created here to also respect user hide/pause settings. This file stays as
-- the historical record; apply both in order.
-- Server-side enforcement of the /app gate.
-- Until now "public read active profiles" let ANY anonymous request read
-- active profiles (the popup was cosmetic — removable via devtools, and the
-- data was scrapeable with the anon key). From now on reading the feed
-- requires a signed-in user who has created their own profile.

-- security definer avoids RLS recursion (the policy below queries the same
-- table it protects).
create or replace function public.has_own_profile()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where owner_id = auth.uid());
$$;

drop policy if exists "public read active profiles" on public.profiles;

create policy "members read active profiles"
  on public.profiles for select
  using (
    (active = true and auth.uid() is not null and public.has_own_profile())
    or public.is_moderator()
  );

-- Unchanged and still in force:
--   "owners read own profile" — you always see your own row (needed to
--   register and to pass has_own_profile()).
