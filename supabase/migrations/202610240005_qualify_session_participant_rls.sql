-- Correct ambiguous outer references in the session RLS policy. This must correlate
-- each invitation/membership to the session row being read, not to inner-table columns.
drop policy if exists "sessions_read_participant" on public.study_sessions;
create policy "sessions_read_participant" on public.study_sessions
  for select to authenticated using (
    creator_id=auth.uid()
    or exists (
      select 1 from public.session_invitations i
      where i.session_id=study_sessions.id and i.user_id=auth.uid()
    )
    or (
      study_sessions.group_id is not null
      and exists (
        select 1 from public.group_memberships m
        where m.group_id=study_sessions.group_id and m.user_id=auth.uid() and m.status='active'
      )
    )
  );
