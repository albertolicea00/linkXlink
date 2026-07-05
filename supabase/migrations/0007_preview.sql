-- Anonymous preview: a small teaser of active profiles for signed-out
-- visitors, without opening the whole feed.
--
-- RLS is row-level and cannot express "at most N rows", so the gate stays
-- locked (migration 0006) and this SECURITY DEFINER function is the single
-- bounded door. It:
--   - returns at most a hard server cap (never client-controlled beyond it),
--   - randomizes which profiles show,
--   - deliberately OMITS whatsapp, so scrapers can't harvest numbers via
--     the preview (contacting requires registering).

create or replace function public.preview_profiles(p_limit integer default 3)
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
  order by random()
  limit least(greatest(coalesce(p_limit, 3), 0), 10);
$$;

-- Callable by anyone (signed out included).
grant execute on function public.preview_profiles(integer) to anon, authenticated;
