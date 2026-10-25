-- Public share links expose only intentionally discoverable academic profiles. The profile table
-- contains no email or phone number; exact availability remains owner-only.
create policy "profiles_public_discoverable" on public.profiles for select to anon using (
  visibility = 'discoverable' and onboarding_completed = true
);
create policy "subjects_public_discoverable" on public.profile_subjects for select to anon using (
  exists (select 1 from public.profiles p where p.id=user_id and p.visibility='discoverable' and p.onboarding_completed=true)
);
create policy "goals_public_discoverable" on public.profile_goals for select to anon using (
  exists (select 1 from public.profiles p where p.id=user_id and p.visibility='discoverable' and p.onboarding_completed=true)
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  connection_updates boolean not null default true,
  group_updates boolean not null default true,
  session_updates boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
create policy "notification_preferences_self_read" on public.notification_preferences for select to authenticated using (user_id=auth.uid());
create policy "notification_preferences_self_insert" on public.notification_preferences for insert to authenticated with check (user_id=auth.uid());
create policy "notification_preferences_self_update" on public.notification_preferences for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

create or replace function public.current_user_in_active_group(p_group uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from public.group_memberships m where m.group_id=p_group and m.user_id=auth.uid() and m.status='active');
$$;
revoke all on function public.current_user_in_active_group(uuid) from public;
grant execute on function public.current_user_in_active_group(uuid) to authenticated;
drop policy if exists "memberships_read_user_or_owner" on public.group_memberships;
create policy "memberships_read_user_or_owner" on public.group_memberships for select to authenticated using (
  user_id = auth.uid() or public.current_user_owns_group(group_id) or public.current_user_in_active_group(group_id)
);

create or replace function public.apply_notification_preferences()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_preferences public.notification_preferences;
  v_enabled boolean := true;
begin
  select * into v_preferences from public.notification_preferences where user_id=new.user_id;
  if found then
    if new.kind like 'connection%' then v_enabled := v_preferences.connection_updates;
    elsif new.kind like 'group%' then v_enabled := v_preferences.group_updates;
    elsif new.kind like 'session%' then v_enabled := v_preferences.session_updates;
    end if;
  end if;
  if not v_enabled then return null; end if;
  return new;
end;
$$;
create trigger notifications_apply_preferences before insert on public.notifications
for each row execute function public.apply_notification_preferences();

create or replace function public.block_student(p_target uuid)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
  v_low uuid;
  v_high uuid;
  v_id uuid;
  v_status text;
  v_blocker uuid;
begin
  if v_uid is null then raise exception 'Sign in to block a student.' using errcode='28000'; end if;
  if p_target is null or p_target=v_uid then raise exception 'You cannot block this account.' using errcode='22023'; end if;
  v_low := least(v_uid,p_target); v_high := greatest(v_uid,p_target);
  perform 1 from public.profiles where id in (v_low,v_high) order by id for update;
  if (select count(*) from public.profiles where id in (v_low,v_high))<>2 then raise exception 'Student not found.' using errcode='P0002'; end if;
  select id,status,blocked_by into v_id,v_status,v_blocker from public.connections where user_low=v_low and user_high=v_high for update;
  if v_status='blocked' then return v_id; end if;
  if v_id is null then
    insert into public.connections(user_low,user_high,initiated_by,status,blocked_by) values(v_low,v_high,v_uid,'blocked',v_uid) returning id into v_id;
  else
    update public.connections set status='blocked',blocked_by=v_uid,updated_at=now() where id=v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function public.block_student(uuid) from public;
grant execute on function public.block_student(uuid) to authenticated;

-- Explicit API grants: RLS remains the authorization boundary for each table operation.
grant usage on schema public to anon, authenticated;
grant select on public.profiles,public.profile_subjects,public.profile_goals to anon;
grant select on public.profiles,public.profile_subjects,public.profile_preferences,public.profile_goals to authenticated;
grant insert,update on public.profiles to authenticated;
grant select,insert,update,delete on public.profile_subjects,public.profile_preferences,public.profile_goals,public.availability to authenticated;
grant select on public.connections,public.group_memberships,public.study_sessions,public.session_invitations to authenticated;
grant select,update,delete on public.study_groups to authenticated;
grant select,update on public.notifications to authenticated;
grant select,insert,update on public.notification_preferences to authenticated;
