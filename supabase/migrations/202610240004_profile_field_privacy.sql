-- Each public profile field has an owner-controlled visibility flag. Exact availability
-- and learning-preference rows remain private regardless of profile visibility.
alter table public.profiles
  add column if not exists show_university boolean not null default true,
  add column if not exists show_degree boolean not null default true,
  add column if not exists show_major boolean not null default true,
  add column if not exists show_academic_year boolean not null default true,
  add column if not exists show_semester boolean not null default true,
  add column if not exists show_bio boolean not null default true,
  add column if not exists show_avatar boolean not null default true,
  add column if not exists show_timezone boolean not null default true,
  add column if not exists show_subjects boolean not null default true,
  add column if not exists show_goals boolean not null default true;

-- Profile rows and relation rows are owner-only through PostgREST. Another student obtains
-- profile information only through the vetted, visibility-filtered functions below.
drop policy if exists "profiles_read_visible" on public.profiles;
drop policy if exists "profiles_public_discoverable" on public.profiles;
create policy "profiles_read_self" on public.profiles
  for select to authenticated using (id=auth.uid());

-- Relation policies are replaced because the previous discoverable-profile policies could
-- return structured subjects/goals even when the owner wanted those fields hidden.
drop policy if exists "subjects_read_visible" on public.profile_subjects;
drop policy if exists "subjects_public_discoverable" on public.profile_subjects;
create policy "subjects_read_self" on public.profile_subjects
  for select to authenticated using (user_id=auth.uid());
drop policy if exists "goals_read_visible" on public.profile_goals;
drop policy if exists "goals_public_discoverable" on public.profile_goals;
create policy "goals_read_self" on public.profile_goals
  for select to authenticated using (user_id=auth.uid());
drop policy if exists "preferences_read_visible" on public.profile_preferences;
create policy "preferences_read_self" on public.profile_preferences
  for select to authenticated using (user_id=auth.uid());

revoke select on public.profiles,public.profile_subjects,public.profile_goals from anon;
grant select on public.profiles,public.profile_subjects,public.profile_preferences,public.profile_goals to authenticated;

create or replace function public.get_public_student_profile(p_profile_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
declare
  v_profile public.profiles;
  v_subjects jsonb := '[]'::jsonb;
  v_goals jsonb := '[]'::jsonb;
begin
  select * into v_profile from public.profiles p
  where p.id=p_profile_id and p.onboarding_completed=true;
  if not found then raise exception 'This profile is not available.' using errcode='P0002'; end if;
  if auth.uid() is null then
    if v_profile.visibility <> 'discoverable' then raise exception 'This profile is private.' using errcode='42501'; end if;
  elsif not public.profile_visible(p_profile_id) then
    raise exception 'This profile is not visible to your account.' using errcode='42501';
  end if;

  if v_profile.show_subjects then
    select coalesce(jsonb_agg(jsonb_build_object('subject',s.subject,'is_priority',s.is_priority) order by s.is_priority desc,s.subject),'[]'::jsonb)
      into v_subjects from public.profile_subjects s where s.user_id=p_profile_id;
  end if;
  if v_profile.show_goals then
    select coalesce(jsonb_agg(jsonb_build_object('goal',g.goal,'label',g.label,'is_primary',g.is_primary) order by g.is_primary desc,g.label),'[]'::jsonb)
      into v_goals from public.profile_goals g where g.user_id=p_profile_id;
  end if;

  return jsonb_build_object(
    'id',v_profile.id,
    'full_name',v_profile.full_name,
    'university',case when v_profile.show_university then v_profile.university else null end,
    'degree',case when v_profile.show_degree then v_profile.degree else null end,
    'major',case when v_profile.show_major then v_profile.major else null end,
    'academic_year',case when v_profile.show_academic_year then v_profile.academic_year else null end,
    'semester',case when v_profile.show_semester then v_profile.semester else null end,
    'bio',case when v_profile.show_bio then v_profile.bio else null end,
    'timezone_name',case when v_profile.show_timezone then v_profile.timezone_name else null end,
    'visibility',v_profile.visibility,
    'onboarding_completed',v_profile.onboarding_completed,
    'subjects',v_subjects,
    'goals',v_goals
  );
end;
$$;
revoke all on function public.get_public_student_profile(uuid) from public;
grant execute on function public.get_public_student_profile(uuid) to anon,authenticated;

create or replace function public.get_visible_student_summaries(p_profile_ids uuid[])
returns table(id uuid,full_name text,university text,major text)
language sql stable security definer set search_path = public, auth, pg_temp as $$
  select p.id,p.full_name,
    case when p.show_university then p.university else null end,
    case when p.show_major then p.major else null end
  from public.profiles p
  where p.id=any(coalesce(p_profile_ids,'{}'::uuid[]))
    and p.onboarding_completed=true
    and public.profile_visible(p.id);
$$;
revoke all on function public.get_visible_student_summaries(uuid[]) from public;
grant execute on function public.get_visible_student_summaries(uuid[]) to authenticated;
