-- Members may leave their own active group membership. The owner retains the group so that
-- capacity and moderation controls always have an accountable owner.
create or replace function public.leave_study_group(p_group uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_status text;
begin
  if v_uid is null then
    raise exception 'Sign in to leave a study group.' using errcode='28000';
  end if;
  select owner_id into v_owner from public.study_groups where id=p_group for update;
  if not found then
    raise exception 'Group not found.' using errcode='P0002';
  end if;
  if v_owner=v_uid then
    raise exception 'The group owner cannot leave before transferring ownership or deleting the group.' using errcode='42501';
  end if;
  select status into v_status from public.group_memberships where group_id=p_group and user_id=v_uid for update;
  if v_status is distinct from 'active' then
    raise exception 'You are not an active member of this group.' using errcode='42501';
  end if;
  delete from public.group_memberships where group_id=p_group and user_id=v_uid;
end;
$$;
revoke all on function public.leave_study_group(uuid) from public;
grant execute on function public.leave_study_group(uuid) to authenticated;
