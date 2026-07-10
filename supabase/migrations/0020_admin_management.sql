-- Let admins promote/demote OTHER admins from the panel, mirroring how
-- moderators are already managed (migration 0005/0008). Until now `admins`
-- only had a self-read policy — no insert/delete policy existed at all, so
-- new admins could only ever be added by hand via the SQL editor.

drop policy if exists "admins read self" on public.admins;
create policy "admins read self or all if admin"
  on public.admins for select
  using (id = auth.uid() or public.is_admin());

create policy "admins insert admins"
  on public.admins for insert
  with check (public.is_admin());

create policy "admins delete admins"
  on public.admins for delete
  using (public.is_admin());
