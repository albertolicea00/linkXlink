-- Link x Link — initial schema
-- Tables: profiles, reports, admins
-- Trigger: auto-increment report_count and disable profile at threshold
-- RLS: public read of active profiles, public insert of reports, admin everything else

-- ============================================================
-- Config
-- ============================================================
-- Report threshold lives here (authoritative) and is mirrored in
-- src/config/app-config.json for UI texts.
create schema if not exists app;

create table if not exists app.settings (
  key text primary key,
  value jsonb not null
);

insert into app.settings (key, value)
values ('report_threshold', '3'::jsonb)
on conflict (key) do nothing;

-- ============================================================
-- Tables
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  whatsapp text not null check (whatsapp ~ '^[0-9]{8,15}$'),
  photos jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  disabled_at timestamptz
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('link_not_found', 'wrong_number', 'fraudulent')),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

create index if not exists reports_profile_id_idx on public.reports (profile_id);
create index if not exists profiles_active_idx on public.profiles (active) where active;

-- ============================================================
-- Trigger: count reports, auto-disable at threshold
-- ============================================================
create or replace function public.handle_report_inserted()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
declare
  threshold integer;
begin
  select (value)::integer into threshold
  from app.settings
  where key = 'report_threshold';

  update public.profiles
  set
    report_count = report_count + 1,
    active = case when report_count + 1 >= coalesce(threshold, 3) then false else active end,
    disabled_at = case
      when report_count + 1 >= coalesce(threshold, 3) and disabled_at is null then now()
      else disabled_at
    end
  where id = new.profile_id;

  return new;
end;
$$;

drop trigger if exists on_report_inserted on public.reports;
create trigger on_report_inserted
  after insert on public.reports
  for each row
  execute function public.handle_report_inserted();

-- ============================================================
-- Helper: is the current user an admin?
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where id = auth.uid());
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.admins enable row level security;

-- profiles: anyone reads active ones; admins read/write everything
create policy "public read active profiles"
  on public.profiles for select
  using (active = true or public.is_admin());

create policy "admins insert profiles"
  on public.profiles for insert
  with check (public.is_admin());

create policy "admins update profiles"
  on public.profiles for update
  using (public.is_admin());

create policy "admins delete profiles"
  on public.profiles for delete
  using (public.is_admin());

-- reports: anyone can insert; only admins read
create policy "public insert reports"
  on public.reports for insert
  with check (true);

create policy "admins read reports"
  on public.reports for select
  using (public.is_admin());

-- admins: self-read only
create policy "admins read self"
  on public.admins for select
  using (id = auth.uid());

-- ============================================================
-- Storage: public bucket for profile photos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "public read profile photos"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

create policy "admins upload profile photos"
  on storage.objects for insert
  with check (bucket_id = 'profile-photos' and public.is_admin());

create policy "admins delete profile photos"
  on storage.objects for delete
  using (bucket_id = 'profile-photos' and public.is_admin());
