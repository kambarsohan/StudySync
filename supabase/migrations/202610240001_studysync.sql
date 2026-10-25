-- StudySync initial schema. All application tables are private by default and protected by RLS.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) between 0 and 100),
  university text check (char_length(university) <= 160),
  degree text check (char_length(degree) <= 120),
  major text check (char_length(major) <= 120),
  academic_year text check (char_length(academic_year) <= 40),
  semester text check (char_length(semester) <= 40),
  bio text check (char_length(bio) <= 500),
  avatar_path text,
  timezone_name text not null default 'UTC',
  collaboration_format text not null default 'either' check (collaboration_format in ('one_to_one','small_group','either')),
  visibility text not null default 'discoverable' check (visibility in ('discoverable','connections','private')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_subjects (
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null check (char_length(trim(subject)) between 1 and 100),
  is_priority boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, subject)
);
create unique index if not exists profile_subjects_casefold_unique on public.profile_subjects(user_id, lower(subject));
create index if not exists profile_subjects_subject_idx on public.profile_subjects(lower(subject));

create table if not exists public.profile_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  preference text not null check (preference in ('practice_problems','conceptual_explanations','flashcards_revision','project_based','discussion_teaching','quiet_coworking')),
  primary key (user_id, preference)
);

create table if not exists public.profile_goals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal text not null check (goal in ('prepare_exams','complete_assignments','learn_skill','build_projects','prepare_interviews','consistent_habit')),
  label text not null check (char_length(label) between 1 and 100),
  is_primary boolean not null default false,
  primary key (user_id, goal)
);
create unique index if not exists profile_goals_one_primary on public.profile_goals(user_id) where is_primary;

-- Recurring availability is stored as local weekday/time ranges with an IANA time zone.
-- Exact ranges are not directly readable by other students; the matching Edge Function compares them.
create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  timezone_name text not null,
  check (end_time > start_time),
  unique (user_id, weekday, start_time, end_time, timezone_name)
);
create index if not exists availability_user_weekday_idx on public.availability(user_id, weekday);

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references public.profiles(id) on delete cascade,
  user_high uuid not null references public.profiles(id) on delete cascade,
  initiated_by uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending','accepted','declined','cancelled','blocked')),
  blocked_by uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_low < user_high),
  check (initiated_by = user_low or initiated_by = user_high),
  check ((status = 'blocked' and blocked_by in (user_low,user_high)) or (status <> 'blocked' and blocked_by is null)),
  unique (user_low,user_high)
);
create index if not exists connections_low_status_idx on public.connections(user_low,status);
create index if not exists connections_high_status_idx on public.connections(user_high,status);

create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  subject text not null check (char_length(trim(subject)) between 1 and 100),
  goal text not null check (char_length(trim(goal)) between 1 and 100),
  capacity smallint not null default 8 check (capacity between 2 and 100),
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists study_groups_subject_idx on public.study_groups(lower(subject));
create index if not exists study_groups_created_idx on public.study_groups(created_at desc);

create table if not exists public.group_memberships (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending','active','declined','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id,user_id)
);
create index if not exists group_memberships_user_status_idx on public.group_memberships(user_id,status);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.study_groups(id) on delete set null,
  title text not null check (char_length(trim(title)) between 3 and 120),
  description text check (char_length(description) <= 1000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone_name text not null,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists study_sessions_creator_starts_idx on public.study_sessions(creator_id,starts_at);
create index if not exists study_sessions_group_starts_idx on public.study_sessions(group_id,starts_at);

create table if not exists public.session_invitations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id,user_id)
);
create index if not exists session_invitations_user_status_idx on public.session_invitations(user_id,status);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 40),
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '' check (char_length(body) <= 500),
  href text,
  entity_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_unread_idx on public.notifications(user_id,created_at desc) where read_at is null;
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger connections_touch_updated_at before update on public.connections for each row execute function public.touch_updated_at();
create trigger study_groups_touch_updated_at before update on public.study_groups for each row execute function public.touch_updated_at();
create trigger group_memberships_touch_updated_at before update on public.group_memberships for each row execute function public.touch_updated_at();
create trigger session_invitations_touch_updated_at before update on public.session_invitations for each row execute function public.touch_updated_at();

create or replace function public.handle_new_studysync_user()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  insert into public.profiles(id,full_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'),''),''))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created_studysync after insert on auth.users for each row execute function public.handle_new_studysync_user();

create or replace function public.profile_visible(p_target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_target and (
      p.id = auth.uid()
      or (auth.uid() is not null and p.visibility = 'discoverable')
      or (auth.uid() is not null and p.visibility = 'connections' and exists (
        select 1 from public.connections c where c.status = 'accepted'
          and ((c.user_low = auth.uid() and c.user_high = p.id) or (c.user_high = auth.uid() and c.user_low = p.id))
      ))
    )
  );
$$;
grant execute on function public.profile_visible(uuid) to authenticated;

create or replace function public.current_user_has_group(p_group uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from public.group_memberships m where m.group_id=p_group and m.user_id=auth.uid() and m.status in ('pending','active'));
$$;
create or replace function public.current_user_owns_group(p_group uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from public.study_groups g where g.id=p_group and g.owner_id=auth.uid());
$$;
grant execute on function public.current_user_has_group(uuid) to authenticated;
grant execute on function public.current_user_owns_group(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.profile_subjects enable row level security;
alter table public.profile_preferences enable row level security;
alter table public.profile_goals enable row level security;
alter table public.availability enable row level security;
alter table public.connections enable row level security;
alter table public.study_groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.study_sessions enable row level security;
alter table public.session_invitations enable row level security;
alter table public.notifications enable row level security;

create policy "profiles_read_visible" on public.profiles for select to authenticated using (public.profile_visible(id));
create policy "profiles_insert_self" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_self" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "subjects_read_visible" on public.profile_subjects for select to authenticated using (public.profile_visible(user_id));
create policy "subjects_insert_self" on public.profile_subjects for insert to authenticated with check (user_id = auth.uid());
create policy "subjects_update_self" on public.profile_subjects for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "subjects_delete_self" on public.profile_subjects for delete to authenticated using (user_id = auth.uid());
create policy "preferences_read_visible" on public.profile_preferences for select to authenticated using (public.profile_visible(user_id));
create policy "preferences_insert_self" on public.profile_preferences for insert to authenticated with check (user_id = auth.uid());
create policy "preferences_delete_self" on public.profile_preferences for delete to authenticated using (user_id = auth.uid());
create policy "goals_read_visible" on public.profile_goals for select to authenticated using (public.profile_visible(user_id));
create policy "goals_insert_self" on public.profile_goals for insert to authenticated with check (user_id = auth.uid());
create policy "goals_update_self" on public.profile_goals for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "goals_delete_self" on public.profile_goals for delete to authenticated using (user_id = auth.uid());
create policy "availability_read_self" on public.availability for select to authenticated using (user_id = auth.uid());
create policy "availability_insert_self" on public.availability for insert to authenticated with check (user_id = auth.uid());
create policy "availability_update_self" on public.availability for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "availability_delete_self" on public.availability for delete to authenticated using (user_id = auth.uid());
create policy "connections_read_participant" on public.connections for select to authenticated using (user_low = auth.uid() or user_high = auth.uid());

create policy "groups_read_discoverable_or_member" on public.study_groups for select to authenticated using (
  visibility = 'public' or owner_id = auth.uid() or public.current_user_has_group(id)
);
create policy "groups_update_owner" on public.study_groups for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "groups_delete_owner" on public.study_groups for delete to authenticated using (owner_id = auth.uid());
create policy "memberships_read_user_or_owner" on public.group_memberships for select to authenticated using (
  user_id = auth.uid() or public.current_user_owns_group(group_id)
);
create policy "sessions_read_participant" on public.study_sessions for select to authenticated using (
  creator_id = auth.uid()
  or exists (select 1 from public.session_invitations i where i.session_id = study_sessions.id and i.user_id = auth.uid())
  or (study_sessions.group_id is not null and exists (select 1 from public.group_memberships m where m.group_id = study_sessions.group_id and m.user_id = auth.uid() and m.status = 'active'))
);
create policy "invitations_read_invitee_or_creator" on public.session_invitations for select to authenticated using (
  user_id = auth.uid() or invited_by = auth.uid()
);
create policy "notifications_read_self" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications_update_self" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.save_onboarding(
  p_profile jsonb,
  p_subjects jsonb,
  p_preferences jsonb,
  p_goals jsonb,
  p_availability jsonb
) returns public.profiles language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_item jsonb;
begin
  if v_uid is null then raise exception 'Sign in to save your profile.' using errcode = '28000'; end if;
  if jsonb_typeof(p_profile) <> 'object' or jsonb_typeof(p_subjects) <> 'array'
     or jsonb_typeof(p_preferences) <> 'array' or jsonb_typeof(p_goals) <> 'array'
     or jsonb_typeof(p_availability) <> 'array' then
    raise exception 'Profile details are incomplete or invalid.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_subjects) > 40 or jsonb_array_length(p_preferences) > 6
     or jsonb_array_length(p_goals) > 6 or jsonb_array_length(p_availability) > 42 then
    raise exception 'One or more profile selections exceed the allowed limit.' using errcode = '22023';
  end if;

  insert into public.profiles(id,full_name,university,degree,major,academic_year,semester,bio,avatar_path,timezone_name,collaboration_format,visibility,onboarding_completed)
  values (
    v_uid,
    coalesce(nullif(trim(p_profile->>'full_name'),''),''),
    nullif(trim(p_profile->>'university'),''), nullif(trim(p_profile->>'degree'),''),
    nullif(trim(p_profile->>'major'),''), nullif(trim(p_profile->>'academic_year'),''),
    nullif(trim(p_profile->>'semester'),''), nullif(trim(p_profile->>'bio'),''),
    nullif(trim(p_profile->>'avatar_path'),''), coalesce(nullif(p_profile->>'timezone_name',''), 'UTC'),
    coalesce(nullif(p_profile->>'collaboration_format',''),'either'),
    coalesce(nullif(p_profile->>'visibility',''),'discoverable'), true
  )
  on conflict (id) do update set
    full_name=excluded.full_name, university=excluded.university, degree=excluded.degree,
    major=excluded.major, academic_year=excluded.academic_year, semester=excluded.semester,
    bio=excluded.bio, avatar_path=excluded.avatar_path, timezone_name=excluded.timezone_name,
    collaboration_format=excluded.collaboration_format, visibility=excluded.visibility,
    onboarding_completed=true
  returning * into v_profile;

  delete from public.profile_subjects where user_id = v_uid;
  for v_item in select value from jsonb_array_elements(p_subjects) loop
    insert into public.profile_subjects(user_id,subject,is_priority)
    values (v_uid,trim(v_item->>'name'),coalesce((v_item->>'priority')::boolean,false));
  end loop;

  delete from public.profile_preferences where user_id = v_uid;
  insert into public.profile_preferences(user_id,preference)
  select v_uid,value #>> '{}' from jsonb_array_elements(p_preferences);

  delete from public.profile_goals where user_id = v_uid;
  for v_item in select value from jsonb_array_elements(p_goals) loop
    insert into public.profile_goals(user_id,goal,label,is_primary)
    values (v_uid,v_item->>'code',v_item->>'label',coalesce((v_item->>'primary')::boolean,false));
  end loop;

  delete from public.availability where user_id = v_uid;
  for v_item in select value from jsonb_array_elements(p_availability) loop
    insert into public.availability(user_id,weekday,start_time,end_time,timezone_name)
    values (v_uid,(v_item->>'weekday')::smallint,(v_item->>'start_time')::time,(v_item->>'end_time')::time,coalesce(v_item->>'timezone_name',v_profile.timezone_name));
  end loop;
  return v_profile;
end;
$$;
revoke all on function public.save_onboarding(jsonb,jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.save_onboarding(jsonb,jsonb,jsonb,jsonb,jsonb) to authenticated;

create or replace function public.request_connection(p_target uuid)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
  v_low uuid;
  v_high uuid;
  v_id uuid;
  v_status text;
  v_initiated uuid;
  v_visibility text;
begin
  if v_uid is null then raise exception 'Sign in to connect.' using errcode='28000'; end if;
  if p_target is null or p_target = v_uid then raise exception 'Choose another student.' using errcode='22023'; end if;
  v_low := least(v_uid,p_target); v_high := greatest(v_uid,p_target);
  perform 1 from public.profiles where id in (v_low,v_high) order by id for update;
  select visibility into v_visibility from public.profiles where id=p_target;
  if v_visibility is distinct from 'discoverable' then raise exception 'This student is not accepting new connections.' using errcode='42501'; end if;
  select id,status,initiated_by into v_id,v_status,v_initiated from public.connections where user_low=v_low and user_high=v_high for update;
  if v_status='blocked' then raise exception 'This connection is blocked.' using errcode='42501'; end if;
  if v_status='accepted' then return v_id; end if;
  if v_status='pending' and v_initiated=p_target then
    update public.connections set status='accepted', updated_at=now() where id=v_id;
    insert into public.notifications(user_id,kind,title,body,href,entity_id) values (p_target,'connection_accepted','Connection accepted','Your request was accepted.','/connections',v_id);
    return v_id;
  end if;
  if v_status='pending' and v_initiated=v_uid then return v_id; end if;
  if v_id is null then
    insert into public.connections(user_low,user_high,initiated_by,status) values (v_low,v_high,v_uid,'pending') returning id into v_id;
  else
    update public.connections set initiated_by=v_uid,status='pending',blocked_by=null,created_at=now(),updated_at=now() where id=v_id;
  end if;
  insert into public.notifications(user_id,kind,title,body,href,entity_id) values (p_target,'connection_request','New study connection request','A student would like to connect.','/connections',v_id);
  return v_id;
end;
$$;

create or replace function public.respond_connection(p_connection uuid,p_action text)
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
  v_row public.connections;
  v_other uuid;
begin
  if v_uid is null then raise exception 'Sign in to manage connections.' using errcode='28000'; end if;
  select * into v_row from public.connections where id=p_connection for update;
  if not found or (v_row.user_low<>v_uid and v_row.user_high<>v_uid) then raise exception 'Connection not found.' using errcode='42501'; end if;
  v_other := case when v_row.user_low=v_uid then v_row.user_high else v_row.user_low end;
  if p_action='accept' or p_action='decline' then
    if v_row.status<>'pending' or v_row.initiated_by=v_uid then raise exception 'Only the recipient can respond to a pending request.' using errcode='42501'; end if;
    update public.connections set status=case when p_action='accept' then 'accepted' else 'declined' end,updated_at=now() where id=p_connection;
    if p_action='accept' then insert into public.notifications(user_id,kind,title,body,href,entity_id) values (v_row.initiated_by,'connection_accepted','You are connected','Your study connection was accepted.','/connections',p_connection); end if;
  elsif p_action='cancel' then
    if v_row.status<>'pending' or v_row.initiated_by<>v_uid then raise exception 'Only the requester can cancel this pending request.' using errcode='42501'; end if;
    update public.connections set status='cancelled',updated_at=now() where id=p_connection;
  elsif p_action='block' then
    update public.connections set status='blocked',blocked_by=v_uid,updated_at=now() where id=p_connection;
  elsif p_action='unblock' then
    if v_row.status<>'blocked' or v_row.blocked_by<>v_uid then raise exception 'Only the person who blocked can unblock this student.' using errcode='42501'; end if;
    delete from public.connections where id=p_connection;
  else raise exception 'Unsupported connection action.' using errcode='22023';
  end if;
end;
$$;
revoke all on function public.request_connection(uuid) from public;
revoke all on function public.respond_connection(uuid,text) from public;
grant execute on function public.request_connection(uuid) to authenticated;
grant execute on function public.respond_connection(uuid,text) to authenticated;

create or replace function public.protect_group_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_active integer;
begin
  if new.capacity < old.capacity then
    select count(*) into v_active from public.group_memberships where group_id=old.id and status='active';
    if new.capacity < v_active then raise exception 'Capacity cannot be lower than current active membership (%).',v_active using errcode='23514'; end if;
  end if;
  return new;
end;
$$;
create trigger study_groups_capacity_guard before update of capacity on public.study_groups for each row execute function public.protect_group_capacity();

create or replace function public.create_study_group(p_title text,p_description text,p_subject text,p_goal text,p_capacity smallint,p_visibility text)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid := auth.uid(); v_group uuid;
begin
  if v_uid is null then raise exception 'Sign in to create a group.' using errcode='28000'; end if;
  insert into public.study_groups(owner_id,title,description,subject,goal,capacity,visibility)
  values(v_uid,trim(p_title),coalesce(p_description,''),trim(p_subject),trim(p_goal),p_capacity,p_visibility) returning id into v_group;
  insert into public.group_memberships(group_id,user_id,status) values(v_group,v_uid,'active');
  return v_group;
end;
$$;

create or replace function public.request_group_membership(p_group uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid := auth.uid(); v_group public.study_groups; v_status text; v_count integer;
begin
  if v_uid is null then raise exception 'Sign in to request membership.' using errcode='28000'; end if;
  select * into v_group from public.study_groups where id=p_group for update;
  if not found or v_group.visibility<>'public' then raise exception 'This group is not open for requests.' using errcode='42501'; end if;
  if v_group.owner_id=v_uid then return; end if;
  select status into v_status from public.group_memberships where group_id=p_group and user_id=v_uid for update;
  if v_status='active' or v_status='pending' then return; end if;
  select count(*) into v_count from public.group_memberships where group_id=p_group and status='active';
  if v_count >= v_group.capacity then raise exception 'This group has reached capacity.' using errcode='23514'; end if;
  insert into public.group_memberships(group_id,user_id,status) values(p_group,v_uid,'pending')
  on conflict(group_id,user_id) do update set status='pending',updated_at=now();
  insert into public.notifications(user_id,kind,title,body,href,entity_id) values(v_group.owner_id,'group_request','New group membership request',v_group.title,'/groups/'||p_group::text,p_group);
end;
$$;

create or replace function public.respond_group_membership(p_group uuid,p_member uuid,p_action text)
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid(); v_group public.study_groups; v_status text; v_active integer;
begin
  if v_uid is null then raise exception 'Sign in to manage group membership.' using errcode='28000'; end if;
  select * into v_group from public.study_groups where id=p_group for update;
  if not found then raise exception 'Group not found.' using errcode='P0002'; end if;
  select status into v_status from public.group_memberships where group_id=p_group and user_id=p_member for update;
  if v_status is null then raise exception 'Membership request not found.' using errcode='P0002'; end if;
  if p_action in ('approve','decline','remove') then
    if v_group.owner_id<>v_uid then raise exception 'Only the group owner can perform this action.' using errcode='42501'; end if;
    if p_action='approve' then
      if v_status<>'pending' then raise exception 'This request is no longer pending.' using errcode='22023'; end if;
      select count(*) into v_active from public.group_memberships where group_id=p_group and status='active';
      if v_active>=v_group.capacity then raise exception 'This group has reached capacity.' using errcode='23514'; end if;
      update public.group_memberships set status='active',updated_at=now() where group_id=p_group and user_id=p_member;
      insert into public.notifications(user_id,kind,title,body,href,entity_id) values(p_member,'group_accepted','You joined a study group',v_group.title,'/groups/'||p_group::text,p_group);
    elsif p_action='decline' then
      if v_status<>'pending' then raise exception 'This request is no longer pending.' using errcode='22023'; end if;
      update public.group_memberships set status='declined',updated_at=now() where group_id=p_group and user_id=p_member;
    else
      if v_status<>'active' or p_member=v_group.owner_id then raise exception 'This member cannot be removed.' using errcode='42501'; end if;
      delete from public.group_memberships where group_id=p_group and user_id=p_member;
    end if;
  elsif p_action='cancel' then
    if p_member<>v_uid or v_status<>'pending' then raise exception 'Only the requester can cancel a pending request.' using errcode='42501'; end if;
    update public.group_memberships set status='cancelled',updated_at=now() where group_id=p_group and user_id=p_member;
  else raise exception 'Unsupported membership action.' using errcode='22023';
  end if;
end;
$$;
revoke all on function public.create_study_group(text,text,text,text,smallint,text) from public;
revoke all on function public.request_group_membership(uuid) from public;
revoke all on function public.respond_group_membership(uuid,uuid,text) from public;
grant execute on function public.create_study_group(text,text,text,text,smallint,text) to authenticated;
grant execute on function public.request_group_membership(uuid) to authenticated;
grant execute on function public.respond_group_membership(uuid,uuid,text) to authenticated;

create or replace function public.create_study_session(
  p_title text,p_description text,p_group_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,
  p_timezone_name text,p_invitee_ids uuid[]
) returns uuid language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid(); v_session uuid; v_group public.study_groups; v_invitee uuid; v_invitees uuid[];
begin
  if v_uid is null then raise exception 'Sign in to schedule a session.' using errcode='28000'; end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at<=p_starts_at or p_starts_at<now()-interval '1 minute' then
    raise exception 'Choose a valid future session time.' using errcode='22023';
  end if;
  if p_timezone_name is null or not exists(select 1 from pg_timezone_names where name=p_timezone_name) then
    raise exception 'Choose a valid time zone.' using errcode='22023';
  end if;
  if coalesce(cardinality(p_invitee_ids),0)>50 then raise exception 'Invite no more than 50 students.' using errcode='22023'; end if;
  if p_group_id is not null then
    select * into v_group from public.study_groups where id=p_group_id for update;
    if not found or not exists(select 1 from public.group_memberships where group_id=p_group_id and user_id=v_uid and status='active') then
      raise exception 'Join the study group before scheduling a group session.' using errcode='42501';
    end if;
  end if;
  insert into public.study_sessions(creator_id,group_id,title,description,starts_at,ends_at,timezone_name)
  values(v_uid,p_group_id,trim(p_title),nullif(trim(p_description),''),p_starts_at,p_ends_at,p_timezone_name) returning id into v_session;

  if p_group_id is not null then
    select coalesce(array_agg(distinct u),array[]::uuid[]) into v_invitees
    from (
      select user_id as u from public.group_memberships where group_id=p_group_id and status='active' and user_id<>v_uid
      union select unnest(coalesce(p_invitee_ids,array[]::uuid[]))
    ) q;
  else
    v_invitees := coalesce(p_invitee_ids,array[]::uuid[]);
  end if;
  foreach v_invitee in array v_invitees loop
    if v_invitee=v_uid then continue; end if;
    if not exists(select 1 from public.profiles where id=v_invitee) then raise exception 'One invited student no longer has an account.' using errcode='23503'; end if;
    if not exists(select 1 from public.connections c where c.status='accepted' and c.user_low=least(v_uid,v_invitee) and c.user_high=greatest(v_uid,v_invitee))
      and not (p_group_id is not null and exists(select 1 from public.group_memberships m where m.group_id=p_group_id and m.user_id=v_invitee and m.status='active')) then
      raise exception 'Invite only accepted connections or active members of this group.' using errcode='42501';
    end if;
    insert into public.session_invitations(session_id,user_id,invited_by,status) values(v_session,v_invitee,v_uid,'pending') on conflict(session_id,user_id) do nothing;
    insert into public.notifications(user_id,kind,title,body,href,entity_id)
    values(v_invitee,'session_invite','Study session invitation',trim(p_title),'/sessions/'||v_session::text,v_session);
  end loop;
  return v_session;
end;
$$;

create or replace function public.respond_session_invite(p_invite uuid,p_action text)
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid := auth.uid(); v_row public.session_invitations; v_session public.study_sessions;
begin
  if v_uid is null then raise exception 'Sign in to respond to invitations.' using errcode='28000'; end if;
  select * into v_row from public.session_invitations where id=p_invite for update;
  if not found or v_row.user_id<>v_uid then raise exception 'Invitation not found.' using errcode='42501'; end if;
  if v_row.status<>'pending' or p_action not in ('accept','decline') then raise exception 'This invitation can no longer be changed.' using errcode='22023'; end if;
  update public.session_invitations set status=case when p_action='accept' then 'accepted' else 'declined' end,updated_at=now() where id=p_invite;
  select * into v_session from public.study_sessions where id=v_row.session_id;
  insert into public.notifications(user_id,kind,title,body,href,entity_id)
  values(v_session.creator_id,'session_response',case when p_action='accept' then 'A student accepted' else 'A student declined' end,v_session.title,'/sessions/'||v_session.id::text,v_session.id);
end;
$$;

create or replace function public.cancel_study_session(p_session uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid := auth.uid(); v_session public.study_sessions; v_user uuid;
begin
  if v_uid is null then raise exception 'Sign in to cancel a session.' using errcode='28000'; end if;
  select * into v_session from public.study_sessions where id=p_session for update;
  if not found or v_session.creator_id<>v_uid then raise exception 'Only the session creator can cancel it.' using errcode='42501'; end if;
  if v_session.canceled_at is not null then return; end if;
  update public.study_sessions set canceled_at=now() where id=p_session;
  for v_user in select user_id from public.session_invitations where session_id=p_session loop
    insert into public.notifications(user_id,kind,title,body,href,entity_id) values(v_user,'session_cancelled','Study session cancelled',v_session.title,'/sessions/'||p_session::text,p_session);
  end loop;
end;
$$;
revoke all on function public.create_study_session(text,text,uuid,timestamptz,timestamptz,text,uuid[]) from public;
revoke all on function public.respond_session_invite(uuid,text) from public;
revoke all on function public.cancel_study_session(uuid) from public;
grant execute on function public.create_study_session(text,text,uuid,timestamptz,timestamptz,text,uuid[]) to authenticated;
grant execute on function public.respond_session_invite(uuid,text) to authenticated;
grant execute on function public.cancel_study_session(uuid) to authenticated;

-- Avatar images are private objects. Signed reads are allowed only for profiles already visible to the viewer.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',false,3145728,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=3145728,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
create policy "avatar_objects_read_visible_profile" on storage.objects for select to authenticated using (
  bucket_id='avatars' and exists (
    select 1 from public.profiles p where p.id::text=split_part(name,'/',1) and public.profile_visible(p.id)
  )
);
create policy "avatar_objects_insert_self" on storage.objects for insert to authenticated with check (
  bucket_id='avatars' and split_part(name,'/',1)=auth.uid()::text
);
create policy "avatar_objects_update_self" on storage.objects for update to authenticated using (
  bucket_id='avatars' and split_part(name,'/',1)=auth.uid()::text
) with check (bucket_id='avatars' and split_part(name,'/',1)=auth.uid()::text);
create policy "avatar_objects_delete_self" on storage.objects for delete to authenticated using (
  bucket_id='avatars' and split_part(name,'/',1)=auth.uid()::text
);
