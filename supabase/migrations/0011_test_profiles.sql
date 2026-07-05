-- 1. Add is_fake flag to profiles
alter table public.profiles
  add column is_fake boolean not null default false;

-- 2. Update preview_profiles RPC to accept p_test_mode
create or replace function public.preview_profiles(p_limit integer default 3, p_test_mode boolean default false)
returns table (
  id uuid,
  name text,
  description text,
  photos jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name, p.description, p.photos, p.created_at
  from public.profiles p
  where p.active = true
    and p.is_fake = p_test_mode
  order by random()
  limit least(greatest(coalesce(p_limit, 3), 0), 10);
$$;

grant execute on function public.preview_profiles(integer, boolean) to anon, authenticated;
