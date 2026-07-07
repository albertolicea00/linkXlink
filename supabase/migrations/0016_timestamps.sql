-- Uniform timestamps: every table carries created_at + updated_at.
--   created_at already exists on all public tables; this adds updated_at to
--   all of them, backfills created_at + updated_at on app.settings (which had
--   neither), and wires a shared BEFORE UPDATE trigger that stamps updated_at.
--
-- Convention going forward: new tables get both columns + the set_updated_at
-- trigger.

-- ------------------------------------------------------------
-- Shared trigger function
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- public tables: add updated_at + attach the trigger
-- ------------------------------------------------------------
do $$
declare
  tbl text;
  tables text[] := array[
    'profiles',
    'reports',
    'admins',
    'moderators',
    'profile_events',
    'moderation_actions',
    'ownership_claims'
  ];
begin
  foreach tbl in array tables loop
    execute format(
      'alter table public.%I add column if not exists updated_at timestamptz not null default now()',
      tbl
    );
    execute format('drop trigger if exists set_updated_at on public.%I', tbl);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()',
      tbl
    );
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- app.settings: had neither column
-- ------------------------------------------------------------
alter table app.settings
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_updated_at on app.settings;
create trigger set_updated_at before update on app.settings
  for each row execute function public.set_updated_at();
