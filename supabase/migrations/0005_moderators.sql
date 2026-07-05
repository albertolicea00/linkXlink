-- Moderators: separate table from admins.
-- Admins keep full power (everything is_admin() granted).
-- Moderators can only do moderation: see all profiles (incl. pending),
-- approve/update them, and write/read the moderation audit trail.

create table if not exists public.moderators (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.moderators enable row level security;

-- Self-read (so the app can detect the role); admins see the whole list.
create policy "moderators read self"
  on public.moderators for select
  using (id = auth.uid() or public.is_admin());

-- Only admins manage the moderator list.
create policy "admins insert moderators"
  on public.moderators for insert
  with check (public.is_admin());

create policy "admins delete moderators"
  on public.moderators for delete
  using (public.is_admin());

-- Helper: moderator OR admin.
create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.moderators where id = auth.uid())
    or public.is_admin();
$$;

-- ============================================================
-- Extend moderation-related policies from admin-only to moderators
-- ============================================================

-- profiles: moderators also see pending/disabled ones and can update (approve)
drop policy if exists "public read active profiles" on public.profiles;
create policy "public read active profiles"
  on public.profiles for select
  using (active = true or public.is_moderator());

drop policy if exists "admins update profiles" on public.profiles;
create policy "moderators update profiles"
  on public.profiles for update
  using (public.is_moderator());

-- moderation_actions: moderators log and read the audit trail
drop policy if exists "moderators insert own actions" on public.moderation_actions;
create policy "moderators insert own actions"
  on public.moderation_actions for insert
  with check (public.is_moderator() and moderator_id = auth.uid());

drop policy if exists "admins read moderation actions" on public.moderation_actions;
create policy "moderators read moderation actions"
  on public.moderation_actions for select
  using (public.is_moderator());

-- Deliberately admin-only (unchanged): insert/delete profiles, read
-- profile_events (metrics), manage moderators.
