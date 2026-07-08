-- Mirrors my_approved_count() (0008) for the deny side of the moderator stats
-- row ("Denied by me").

create or replace function public.my_denied_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.moderation_actions
  where moderator_id = auth.uid() and action = 'deny';
$$;

grant execute on function public.my_denied_count() to authenticated;
