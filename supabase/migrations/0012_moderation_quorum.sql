-- Moderation quorum + deny reasons.
--   Until now a single moderator approved a pending profile with a direct
--   UPDATE (Admin.tsx). This introduces server-side quorum: approve and deny
--   each require either ONE admin or N distinct moderators (N configurable in
--   app.settings, mirrored in app-config.json for UI). Deny also records a
--   free-text reason (the UI offers a fixed pick-list from config).
--
-- State model for a pending profile (active = false, report_count = 0):
--   pending            → still awaiting quorum
--   approved           → active = true
--   denied             → active = false AND denied_at is not null
-- The moderator queue must exclude denied rows, so we add denied_at to tell
-- "denied" apart from "still pending".

-- ------------------------------------------------------------
-- Schema: reason column, 'deny' action, denied_at, one-vote index
-- ------------------------------------------------------------
alter table public.moderation_actions
  add column if not exists reason text check (char_length(reason) <= 500);

alter table public.moderation_actions
  drop constraint if exists moderation_actions_action_check;
alter table public.moderation_actions
  add constraint moderation_actions_action_check
  check (action in ('approve', 'deny', 'skip', 'ban', 'reactivate'));

alter table public.profiles
  add column if not exists denied_at timestamptz;

-- One approve/deny VOTE per moderator per profile (skips may repeat freely).
-- Dedupe any historical duplicates before the unique index can be built.
delete from public.moderation_actions a
using public.moderation_actions b
where a.action in ('approve', 'deny')
  and a.action = b.action
  and a.profile_id = b.profile_id
  and a.moderator_id = b.moderator_id
  and a.ctid < b.ctid;

create unique index if not exists moderation_actions_vote_unique
  on public.moderation_actions (profile_id, moderator_id, action)
  where action in ('approve', 'deny');

-- Authoritative quorum thresholds (mirrored in app-config.json for UI).
insert into app.settings (key, value) values
  ('approve_quorum', '1'::jsonb),
  ('deny_quorum', '3'::jsonb)
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- RPC: moderate_profile — records a vote, applies state on quorum
-- ------------------------------------------------------------
-- security definer so the vote count and the profile flip run with full
-- privileges (the caller only ever proves is_moderator()). Returns the
-- running tally so the UI can say "vote 2 of 3 recorded".
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
    return jsonb_build_object('applied', false, 'votes', 0, 'quorum', 0);
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
    if p_action = 'approve' then
      update public.profiles
      set active = true, report_count = 0, disabled_at = null, denied_at = null
      where id = p_profile_id;
    else
      update public.profiles
      set active = false, denied_at = now()
      where id = p_profile_id;
    end if;
    v_applied := true;
  end if;

  return jsonb_build_object('applied', v_applied, 'votes', v_votes, 'quorum', v_quorum);
end;
$$;

grant execute on function public.moderate_profile(uuid, text, text) to authenticated;
