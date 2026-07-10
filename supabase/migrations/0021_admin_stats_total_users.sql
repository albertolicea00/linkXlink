-- Add `totalUsers` (all auth accounts) to the admin dashboard counters.
--   The dashboard "TOTAL" card is meant to show total USERS (accounts), not
--   the count of profile rows — migrated seed profiles are ownerless and far
--   outnumber real accounts, so counting profiles there was misleading
--   (e.g. 1287 migrated profiles vs ~1000 real accounts).
--
--   Like `noProfile`, this needs auth.users, which the client can never read
--   directly — hence it lives in this security-definer RPC. `create or replace`
--   supersedes the definition from migration 0018.

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
  v_total_users integer;
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
  select count(*) into v_total_users from auth.users;

  return jsonb_build_object(
    'fake', v_fake,
    'migrated', v_migrated,
    'migratedUnclaimed', v_migrated_unclaimed,
    'admins', v_admins,
    'noProfile', v_no_profile,
    'totalUsers', v_total_users
  );
end;
$$;

grant execute on function public.admin_stats() to authenticated;
