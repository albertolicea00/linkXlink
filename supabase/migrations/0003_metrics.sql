-- Metrics and moderation audit trail.
-- profile_events: anonymous usage events (who viewed / clicked WhatsApp on
--   which profile, keyed by an anonymous per-device id).
-- moderation_actions: which moderator approved/skipped/banned which profile.

create table if not exists public.profile_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  event text not null check (event in ('view', 'whatsapp_click')),
  device_id text check (char_length(device_id) <= 64),
  created_at timestamptz not null default now()
);

create index if not exists profile_events_profile_idx
  on public.profile_events (profile_id, event);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  moderator_id uuid not null references auth.users (id),
  action text not null check (action in ('approve', 'skip', 'ban', 'reactivate')),
  created_at timestamptz not null default now()
);

create index if not exists moderation_actions_profile_idx
  on public.moderation_actions (profile_id);

create index if not exists moderation_actions_moderator_idx
  on public.moderation_actions (moderator_id);

alter table public.profile_events enable row level security;
alter table public.moderation_actions enable row level security;

-- Anyone can emit events (anonymous metrics); only admins read them.
create policy "public insert profile events"
  on public.profile_events for insert
  with check (true);

create policy "admins read profile events"
  on public.profile_events for select
  using (public.is_admin());

-- Moderators log actions as themselves; admins read the audit trail.
create policy "moderators insert own actions"
  on public.moderation_actions for insert
  with check (public.is_admin() and moderator_id = auth.uid());

create policy "admins read moderation actions"
  on public.moderation_actions for select
  using (public.is_admin());
