-- Global admin dashboard counters — fake profiles, migrated (total + unclaimed),
-- admins, and accounts with no profile at all.
--   These are DATABASE-WIDE counts, deliberately independent of any client-side
--   dev flag (showFakes, etc.) or the moderator/admin's current profiles query
--   filter — the admin view must always see the true totals, not whatever
--   subset happens to be loaded in the panel at the time.
--
--   users_without_profile needs auth.users, which the client can never read
--   directly — hence a security definer RPC rather than a client-side count().

create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_fake integer;
  v_migrated integer;
  v_migrated_unclaimed integer;
  v_admins integer;
  v_no_profile integer;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select count(*) into v_fake from public.profiles where is_fake = true;
  select count(*) into v_migrated from public.profiles where migrated = true;
  select count(*) into v_migrated_unclaimed
    from public.profiles where migrated = true and owner_id is null;
  select count(*) into v_admins from public.admins;
  select count(*) into v_no_profile
    from auth.users u
    where not exists (select 1 from public.profiles p where p.owner_id = u.id);

  return jsonb_build_object(
    'fake', v_fake,
    'migrated', v_migrated,
    'migratedUnclaimed', v_migrated_unclaimed,
    'admins', v_admins,
    'noProfile', v_no_profile
  );
end;
$$;

grant execute on function public.admin_stats() to authenticated;
