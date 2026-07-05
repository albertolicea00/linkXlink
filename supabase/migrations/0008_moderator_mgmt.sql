-- Admin tooling to manage moderators from the panel.
-- Admins can search existing user accounts by email and promote them.
-- (Inserting/deleting rows in `moderators` is already admin-only via RLS
-- from migration 0005 — this only adds the user search, since auth.users
-- is not directly readable from the client.)

create or replace function public.search_users(p_term text)
returns table (id uuid, email text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id, u.email
  from auth.users u
  where public.is_admin()          -- non-admins get zero rows
    and coalesce(p_term, '') <> ''
    and u.email ilike '%' || p_term || '%'
  order by u.email
  limit 10;
$$;

grant execute on function public.search_users(text) to authenticated;

-- How many profiles a given moderator has approved (for their stats).
create or replace function public.my_approved_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.moderation_actions
  where moderator_id = auth.uid() and action = 'approve';
$$;

grant execute on function public.my_approved_count() to authenticated;
