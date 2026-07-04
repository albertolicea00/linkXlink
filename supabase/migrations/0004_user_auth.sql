-- User accounts for self-registration.
-- Profiles get an owner (auth.users); creating a profile now requires being
-- signed in (Google / Apple / Facebook / email via Supabase Auth).

alter table public.profiles
  add column if not exists owner_id uuid references auth.users (id) on delete set null;

-- One profile per account.
create unique index if not exists profiles_owner_unique
  on public.profiles (owner_id)
  where owner_id is not null;

-- Replace the anonymous-insert policy: signed-in users only, always as
-- themselves, always pending (active = false).
drop policy if exists "public insert pending profiles" on public.profiles;

create policy "users insert own pending profile"
  on public.profiles for insert
  with check (
    auth.uid() is not null
    and owner_id = auth.uid()
    and active = false
    and report_count = 0
    and disabled_at is null
  );

-- Owners can see their own profile even while pending/disabled.
create policy "owners read own profile"
  on public.profiles for select
  using (owner_id = auth.uid());

-- Photo uploads now require a signed-in user too.
drop policy if exists "public upload profile photos" on storage.objects;

create policy "authenticated upload profile photos"
  on storage.objects for insert
  with check (bucket_id = 'profile-photos' and auth.uid() is not null);
