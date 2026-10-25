import { requireSupabase } from './supabase'
import type { NotificationItem, Profile, StudentMatch } from './types'

export type OnboardingPayload = {
  profile: Partial<Profile> & { full_name: string; timezone_name: string; collaboration_format: string; visibility: string }
  subjects: { name: string; priority: boolean }[]
  preferences: string[]
  goals: { code: string; label: string; primary: boolean }[]
  availability: { weekday: number; start_time: string; end_time: string; timezone_name: string }[]
}

export async function saveOnboarding(payload: OnboardingPayload) {
  const { data, error } = await requireSupabase().rpc('save_onboarding', {
    p_profile: payload.profile, p_subjects: payload.subjects, p_preferences: payload.preferences,
    p_goals: payload.goals, p_availability: payload.availability,
  })
  if (error) throw error
  return data as Profile
}

export async function saveProfile(userId: string, values: Partial<Profile>) {
  const { data, error } = await requireSupabase().from('profiles').update(values).eq('id', userId).select('*').single()
  if (error) throw error
  return data as Profile
}

export async function uploadAvatar(userId: string, file: File) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WebP image.')
  if (file.size > 3 * 1024 * 1024) throw new Error('Avatar images must be 3 MB or smaller.')
  const extension=file.type.split('/')[1].replace('jpeg','jpg')
  const path=`${userId}/${crypto.randomUUID()}.${extension}`
  const {error}=await requireSupabase().storage.from('avatars').upload(path,file,{contentType:file.type,upsert:false})
  if(error)throw error
  return path
}

export async function signedAvatar(path?:string|null) {
  if(!path)return null
  const {data,error}=await requireSupabase().storage.from('avatars').createSignedUrl(path,3600)
  return error?null:data.signedUrl
}

export async function getMatches() {
  const {data,error}=await requireSupabase().functions.invoke('match-students',{body:{}})
  if(error)throw error
  return (data?.matches??[]) as StudentMatch[]
}

export type ConnectionRow = {
  id:string; user_low:string; user_high:string; initiated_by:string;
  status:'pending'|'accepted'|'declined'|'cancelled'|'blocked'; blocked_by:string|null; created_at:string
}
export async function getConnections() {
  const {data,error}=await requireSupabase().from('connections').select('*').order('updated_at',{ascending:false})
  if(error)throw error
  return (data??[]) as ConnectionRow[]
}
export async function requestConnection(targetId:string) {
  const {data,error}=await requireSupabase().rpc('request_connection',{p_target:targetId})
  if(error)throw error
  return data as string
}
export async function respondConnection(connectionId:string,action:'accept'|'decline'|'cancel'|'block'|'unblock') {
  const {error}=await requireSupabase().rpc('respond_connection',{p_connection:connectionId,p_action:action})
  if(error)throw error
}
export async function blockStudent(targetId:string) {
  const {data,error}=await requireSupabase().rpc('block_student',{p_target:targetId})
  if(error)throw error
  return data as string
}

export type StudyGroup = { id:string; owner_id:string; title:string; description:string; subject:string; goal:string; capacity:number; visibility:'public'|'private'; created_at:string }
export type Membership = { group_id:string; user_id:string; status:'pending'|'active'|'declined'|'cancelled'; created_at:string }
export async function getGroups() {
  const {data,error}=await requireSupabase().from('study_groups').select('*').eq('visibility','public').order('created_at',{ascending:false})
  if(error)throw error
  return (data??[]) as StudyGroup[]
}
export async function getGroupsByIds(ids:string[]) {
  if(!ids.length)return [] as StudyGroup[]
  const {data,error}=await requireSupabase().from('study_groups').select('*').in('id',ids)
  if(error)throw error
  return (data??[]) as StudyGroup[]
}
export async function getGroup(id:string) {
  const client=requireSupabase()
  const {data,error}=await client.from('study_groups').select('*').eq('id',id).single()
  if(error)throw error
  const {data:members,error:memberError}=await client.from('group_memberships').select('*').eq('group_id',id).order('created_at')
  if(memberError)throw memberError
  return {group:data as StudyGroup,memberships:(members??[]) as Membership[]}
}
export async function createGroup(input:{title:string;description:string;subject:string;goal:string;capacity:number;visibility:string}) {
  const {data,error}=await requireSupabase().rpc('create_study_group',{
    p_title:input.title,p_description:input.description,p_subject:input.subject,p_goal:input.goal,p_capacity:input.capacity,p_visibility:input.visibility,
  })
  if(error)throw error
  return data as string
}
export async function requestGroupMembership(groupId:string) {
  const {error}=await requireSupabase().rpc('request_group_membership',{p_group:groupId})
  if(error)throw error
}
export async function respondGroupMembership(groupId:string,memberId:string,action:'approve'|'decline'|'cancel'|'remove'|'leave') {
  if(action==='leave'){
    const {error}=await requireSupabase().rpc('leave_study_group',{p_group:groupId})
    if(error)throw error
    return
  }
  const {error}=await requireSupabase().rpc('respond_group_membership',{p_group:groupId,p_member:memberId,p_action:action})
  if(error)throw error
}
export async function getMyMemberships(userId:string) {
  const {data,error}=await requireSupabase().from('group_memberships').select('*').eq('user_id',userId).in('status',['pending','active'])
  if(error)throw error
  return (data??[]) as Membership[]
}

export type StudySession = { id:string; creator_id:string; group_id:string|null; title:string; description:string|null; starts_at:string; ends_at:string; timezone_name:string; canceled_at:string|null; created_at:string }
export type SessionInvite = { id:string; session_id:string; user_id:string; invited_by:string; status:string; created_at:string }
export async function getSessions() {
  const {data,error}=await requireSupabase().from('study_sessions').select('*').order('starts_at',{ascending:true})
  if(error)throw error
  return (data??[]) as StudySession[]
}
export async function getSession(id:string) {
  const client=requireSupabase()
  const {data,error}=await client.from('study_sessions').select('*').eq('id',id).single()
  if(error)throw error
  const {data:invites,error:inviteError}=await client.from('session_invitations').select('*').eq('session_id',id)
  if(inviteError)throw inviteError
  return {session:data as StudySession,invitations:(invites??[]) as SessionInvite[]}
}
export async function getMySessionInvitations(userId:string) {
  const {data,error}=await requireSupabase().from('session_invitations').select('*').eq('user_id',userId).order('created_at',{ascending:false})
  if(error)throw error
  return (data??[]) as SessionInvite[]
}
export async function createSession(input:{title:string;description:string;groupId:string|null;startsAt:string;endsAt:string;timezone:string;invitees:string[]}) {
  const {data,error}=await requireSupabase().rpc('create_study_session',{
    p_title:input.title,p_description:input.description,p_group_id:input.groupId,p_starts_at:input.startsAt,
    p_ends_at:input.endsAt,p_timezone_name:input.timezone,p_invitee_ids:input.invitees,
  })
  if(error)throw error
  return data as string
}
export async function respondSessionInvite(inviteId:string,action:'accept'|'decline') {
  const {error}=await requireSupabase().rpc('respond_session_invite',{p_invite:inviteId,p_action:action})
  if(error)throw error
}
export async function cancelSession(sessionId:string) {
  const {error}=await requireSupabase().rpc('cancel_study_session',{p_session:sessionId})
  if(error)throw error
}

export async function getNotifications() {
  const {data,error}=await requireSupabase().from('notifications').select('*').order('created_at',{ascending:false}).limit(100)
  if(error)throw error
  return (data??[]) as NotificationItem[]
}
export async function markNotificationRead(id:string) {
  const {error}=await requireSupabase().from('notifications').update({read_at:new Date().toISOString()}).eq('id',id)
  if(error)throw error
}
export async function markAllNotificationsRead() {
  const {error}=await requireSupabase().from('notifications').update({read_at:new Date().toISOString()}).is('read_at',null)
  if(error)throw error
}

export async function deleteAccount(password:string) {
  const client=requireSupabase()
  const {error}=await client.functions.invoke('delete-account',{body:{password}})
  if(error)throw error
  await client.auth.signOut({scope:'local'})
}

export type PublicStudentProfile = Pick<Profile,'id'|'full_name'|'visibility'|'onboarding_completed'> & {
  university:string|null; degree:string|null; major:string|null; academic_year:string|null; semester:string|null; bio:string|null; timezone_name:string|null
  subjects:{subject:string;is_priority:boolean}[];goals:{goal:string;label:string;is_primary:boolean}[]
}
export async function getStudentProfile(id:string) {
  const client=requireSupabase()
  const {data,error}=await client.rpc('get_public_student_profile',{p_profile_id:id})
  if(error)throw error
  return data as PublicStudentProfile
}
export async function getVisibleProfiles(ids:string[]) {
  if(!ids.length)return [] as Pick<Profile,'id'|'full_name'|'university'|'major'|'avatar_path'>[]
  const {data,error}=await requireSupabase().rpc('get_visible_student_summaries',{p_profile_ids:ids})
  if(error)throw error
  return (data||[]) as Pick<Profile,'id'|'full_name'|'university'|'major'>[]
}
export async function getProfilesByIds(ids:string[]) { return getVisibleProfiles(ids) }

export async function getMyProfileBundle(userId:string) {
  const client=requireSupabase()
  const [profileResult,subjectsResult,preferencesResult,goalsResult,availabilityResult]=await Promise.all([
    client.from('profiles').select('*').eq('id',userId).single(),
    client.from('profile_subjects').select('subject,is_priority').eq('user_id',userId).order('subject'),
    client.from('profile_preferences').select('preference').eq('user_id',userId),
    client.from('profile_goals').select('goal,label,is_primary').eq('user_id',userId),
    client.from('availability').select('weekday,start_time,end_time,timezone_name').eq('user_id',userId).order('weekday'),
  ])
  for(const result of [profileResult,subjectsResult,preferencesResult,goalsResult,availabilityResult])if(result.error)throw result.error
  return {
    profile:profileResult.data as Profile,
    subjects:(subjectsResult.data||[]) as {subject:string;is_priority:boolean}[],
    preferences:(preferencesResult.data||[]).map((row:{preference:string})=>row.preference),
    goals:(goalsResult.data||[]) as {goal:string;label:string;is_primary:boolean}[],
    availability:(availabilityResult.data||[]) as {weekday:number;start_time:string;end_time:string;timezone_name:string}[],
  }
}

export type NotificationPreferences={connection_updates:boolean;group_updates:boolean;session_updates:boolean}
export const DEFAULT_NOTIFICATION_PREFERENCES:NotificationPreferences={connection_updates:true,group_updates:true,session_updates:true}
export async function getNotificationPreferences(userId:string) {
  const {data,error}=await requireSupabase().from('notification_preferences').select('connection_updates,group_updates,session_updates').eq('user_id',userId).maybeSingle()
  if(error)throw error
  return (data as NotificationPreferences|null)||DEFAULT_NOTIFICATION_PREFERENCES
}
export async function saveNotificationPreferences(userId:string,preferences:NotificationPreferences) {
  const {error}=await requireSupabase().from('notification_preferences').upsert({user_id:userId,...preferences},{onConflict:'user_id'})
  if(error)throw error
}
