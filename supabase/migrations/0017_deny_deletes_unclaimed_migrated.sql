-- Denying an unclaimed migrated (seed) profile deletes it instead of soft-denying.
--   A migrated row with owner_id IS NULL has no real registrant behind it — it's
--   synthetic seed data. Soft-denying it (active=false, denied_at=now(), as for
--   real users) would leave a permanent stub that squats the WhatsApp number
--   (unique index) forever, blocking the real person from ever claiming or
--   registering that number. Deleting it frees the number for a legitimate
--   future registration/claim. Real users (owner_id set, or not migrated) keep
--   the existing soft-deny behavior — they stay auditable and reversible.
--
-- ON DELETE CASCADE already covers moderation_actions, reports, profile_events,
-- ownership_claims (see their table definitions) — deleting the profile row
-- cleans up cleanly, including the very deny vote just recorded, in the same
-- transaction as this function call.

create or replace function public.moderate_profile(
  p_profile_id uuid,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := public.is_admin();
  v_votes integer := 0;
  v_quorum integer;
  v_applied boolean := false;
  v_deleted boolean := false;
  v_migrated boolean;
  v_owner uuid;
begin
  if not public.is_moderator() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_action not in ('approve', 'deny', 'skip') then
    raise exception 'invalid action %', p_action using errcode = '22023';
  end if;

  -- Skip: log only, never dedupes, never changes profile state.
  if p_action = 'skip' then
    insert into public.moderation_actions (profile_id, moderator_id, action)
    values (p_profile_id, v_uid, 'skip');
    return jsonb_build_object('applied', false, 'votes', 0, 'quorum', 0, 'deleted', false);
  end if;

  if p_action = 'deny' and coalesce(btrim(p_reason), '') = '' then
    raise exception 'deny requires a reason' using errcode = '22023';
  end if;

  -- Record / refresh this moderator's vote (idempotent per profile+action).
  insert into public.moderation_actions (profile_id, moderator_id, action, reason)
  values (p_profile_id, v_uid, p_action, p_reason)
  on conflict (profile_id, moderator_id, action) where action in ('approve', 'deny')
  do update set reason = excluded.reason, created_at = now();

  select count(distinct moderator_id) into v_votes
  from public.moderation_actions
  where profile_id = p_profile_id and action = p_action;

  select (value)::integer into v_quorum
  from app.settings
  where key = case when p_action = 'approve' then 'approve_quorum' else 'deny_quorum' end;
  v_quorum := coalesce(v_quorum, case when p_action = 'approve' then 1 else 3 end);

  if v_is_admin or v_votes >= v_quorum then
    v_applied := true;

    if p_action = 'approve' then
      update public.profiles
      set active = true, report_count = 0, disabled_at = null, denied_at = null
      where id = p_profile_id;
    else
      select migrated, owner_id into v_migrated, v_owner
      from public.profiles
      where id = p_profile_id;

      if coalesce(v_migrated, false) and v_owner is null then
        delete from public.profiles where id = p_profile_id;
        v_deleted := true;
      else
        update public.profiles
        set active = false, denied_at = now()
        where id = p_profile_id;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'applied', v_applied,
    'votes', v_votes,
    'quorum', v_quorum,
    'deleted', v_deleted
  );
end;
$$;

grant execute on function public.moderate_profile(uuid, text, text) to authenticated;
