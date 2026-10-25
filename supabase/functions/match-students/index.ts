// @ts-nocheck — this function is compiled by the Supabase Deno runtime, not the Vite browser project.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const weights = { subjects: 40, availability: 25, goals: 20, preferences: 15 } as const

type Availability = { weekday: number; start_time: string; end_time: string; timezone_name: string }
type AvailabilityRow = Availability & { user_id: string }
type Interval = { start: number; end: number }
type ProfileRow = {
  id: string; full_name: string; university: string | null; degree: string | null; major: string | null;
  academic_year: string | null; semester: string | null; bio: string | null; avatar_path: string | null;
  timezone_name: string; visibility: string; onboarding_completed: boolean;
  show_university:boolean; show_degree:boolean; show_major:boolean; show_academic_year:boolean; show_semester:boolean;
  show_bio:boolean; show_avatar:boolean; show_timezone:boolean; show_subjects:boolean; show_goals:boolean;
}
type RelationRow = { user_id: string; subject?: string; preference?: string; goal?: string }

function partsAt(instant: Date, zone: string) {
  const entries = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant)
  return Object.fromEntries(entries.map((part) => [part.type, part.value])) as Record<string,string>
}

function localTimeToUtc(date: string, clock: string, zone: string) {
  const [year,month,day] = date.split('-').map(Number)
  const [hour,minute] = clock.slice(0,5).split(':').map(Number)
  const desiredWall = Date.UTC(year, month - 1, day, hour, minute, 0)
  let guess = desiredWall
  for (let attempt = 0; attempt < 5; attempt++) {
    const p = partsAt(new Date(guess), zone)
    const representedWall = Date.UTC(Number(p.year), Number(p.month)-1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second))
    const correction = desiredWall - representedWall
    if (correction === 0) break
    guess += correction
  }
  return guess
}

function futureLocalDates(zone: string, now: number) {
  const dates = new Map<string,number>()
  for (let instant = now; instant < now + 15 * 86400000; instant += 6 * 3600000) {
    const p = partsAt(new Date(instant), zone)
    const key = `${p.year}-${p.month}-${p.day}`
    const weekday = new Date(`${key}T12:00:00.000Z`).getUTCDay()
    dates.set(key, weekday)
  }
  return dates
}

function availabilityIntervals(rows: Availability[], now: number): Interval[] {
  const intervals: Interval[] = []
  for (const row of rows) {
    let dates: Map<string,number>
    try { dates = futureLocalDates(row.timezone_name, now) } catch { continue }
    for (const [date,weekday] of dates) {
      if (weekday !== Number(row.weekday)) continue
      try {
        const start = Math.max(now, localTimeToUtc(date,row.start_time,row.timezone_name))
        const end = localTimeToUtc(date,row.end_time,row.timezone_name)
        if (end > start) intervals.push({ start, end })
      } catch { /* Ignore an invalid IANA time-zone row rather than fail discovery. */ }
    }
  }
  intervals.sort((a,b) => a.start - b.start)
  const merged: Interval[] = []
  for (const interval of intervals) {
    const last = merged.at(-1)
    if (last && interval.start <= last.end) last.end = Math.max(last.end, interval.end)
    else merged.push({ ...interval })
  }
  return merged
}

function overlapScore(aRows: Availability[], bRows: Availability[], now: number) {
  const a = availabilityIntervals(aRows,now)
  const b = availabilityIntervals(bRows,now)
  const aMinutes = a.reduce((sum,item) => sum + item.end - item.start,0)
  const bMinutes = b.reduce((sum,item) => sum + item.end - item.start,0)
  if (!aMinutes || !bMinutes) return { score: 0, overlapMinutes: 0 }
  let i=0, j=0, overlap=0
  while (i<a.length && j<b.length) {
    overlap += Math.max(0,Math.min(a[i].end,b[j].end)-Math.max(a[i].start,b[j].start))
    if (a[i].end < b[j].end) i++; else j++
  }
  return { score: Math.max(0,Math.min(1,overlap/Math.min(aMinutes,bMinutes))), overlapMinutes: Math.round(overlap/60000) }
}

function factor(a: string[], b: string[], weight: number, label: string) {
  const setA = new Map(a.map((item) => [item.trim().toLocaleLowerCase('en-US'),item.trim()]))
  const setB = new Map(b.map((item) => [item.trim().toLocaleLowerCase('en-US'),item.trim()]))
  const shared = [...setA.entries()].filter(([key]) => setB.has(key)).map(([,label]) => label)
  const union = new Set([...setA.keys(),...setB.keys()])
  const score = union.size ? shared.length / union.size : 0
  return { score: Math.round(score*100), weight, shared, detail: shared.length ? `You share ${shared.length} ${label}${shared.length===1?'':'s'}.` : `No shared ${label} yet.` }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok',{headers:cors})
  if (request.method !== 'POST') return new Response(JSON.stringify({error:'Method not allowed'}),{status:405,headers:{...cors,'Content-Type':'application/json'}})
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const bearer = request.headers.get('Authorization') || ''
    const token = bearer.replace(/^Bearer\s+/i,'')
    if (!token) return new Response(JSON.stringify({error:'Sign in to find study partners.'}),{status:401,headers:{...cors,'Content-Type':'application/json'}})
    const authClient = createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const { data: authData, error: authError } = await authClient.auth.getUser(token)
    if (authError || !authData.user) return new Response(JSON.stringify({error:'Your session is no longer valid. Sign in again.'}),{status:401,headers:{...cors,'Content-Type':'application/json'}})
    const userId = authData.user.id
    const admin = createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const { data: own, error: ownError } = await admin.from('profiles').select('id,onboarding_completed').eq('id',userId).maybeSingle()
    if (ownError) throw ownError
    if (!own?.onboarding_completed) return new Response(JSON.stringify({error:'Complete your study profile before using discovery.'}),{status:409,headers:{...cors,'Content-Type':'application/json'}})

    const { data: candidates, error: profileError } = await admin.from('profiles')
      .select('id,full_name,university,degree,major,academic_year,semester,bio,avatar_path,timezone_name,visibility,onboarding_completed,show_university,show_degree,show_major,show_academic_year,show_semester,show_bio,show_avatar,show_timezone,show_subjects,show_goals')
      .eq('visibility','discoverable').eq('onboarding_completed',true).eq('show_subjects',true).eq('show_goals',true).neq('id',userId).limit(250)
    if (profileError) throw profileError
    const blockedQuery = await admin.from('connections').select('user_low,user_high').eq('status','blocked').or(`user_low.eq.${userId},user_high.eq.${userId}`)
    if (blockedQuery.error) throw blockedQuery.error
    const blockedIds = new Set((blockedQuery.data || []).flatMap((row:{user_low:string;user_high:string}) => [row.user_low,row.user_high]).filter((id:string) => id!==userId))
    const eligible = ((candidates || []) as ProfileRow[]).filter((candidate) => !blockedIds.has(candidate.id))
    const ids = [userId,...eligible.map((candidate) => candidate.id)]
    const [subjectResult,preferenceResult,goalResult,availabilityResult] = await Promise.all([
      admin.from('profile_subjects').select('user_id,subject').in('user_id',ids),
      admin.from('profile_preferences').select('user_id,preference').in('user_id',ids),
      admin.from('profile_goals').select('user_id,goal').in('user_id',ids),
      admin.from('availability').select('user_id,weekday,start_time,end_time,timezone_name').in('user_id',ids),
    ])
    for (const result of [subjectResult,preferenceResult,goalResult,availabilityResult]) if (result.error) throw result.error
    const groupByUser = <T extends {user_id:string}>(rows:T[]) => rows.reduce((map,row) => { const current=map.get(row.user_id)||[];current.push(row);map.set(row.user_id,current);return map },new Map<string,T[]>())
    const subjectMap = groupByUser((subjectResult.data || []) as RelationRow[])
    const prefMap = groupByUser((preferenceResult.data || []) as RelationRow[])
    const goalMap = groupByUser((goalResult.data || []) as RelationRow[])
    const availabilityMap = groupByUser((availabilityResult.data || []) as AvailabilityRow[])
    const ownSubjects = (subjectMap.get(userId)||[]).map((row) => row.subject || '')
    const ownPrefs = (prefMap.get(userId)||[]).map((row) => row.preference || '')
    const ownGoals = (goalMap.get(userId)||[]).map((row) => row.goal || '')
    const now = Date.now()

    const matches = await Promise.all(eligible.map(async (candidate) => {
      const subjects = (subjectMap.get(candidate.id)||[]).map((row) => row.subject || '')
      const prefs = (prefMap.get(candidate.id)||[]).map((row) => row.preference || '')
      const goals = (goalMap.get(candidate.id)||[]).map((row) => row.goal || '')
      const subjectFactor = factor(ownSubjects,subjects,weights.subjects,'subject')
      const goalFactor = factor(ownGoals,goals,weights.goals,'goal')
      const preferenceFactor = factor(ownPrefs,prefs,weights.preferences,'study preference')
      const visibleSubjectFactor = candidate.show_subjects
        ? subjectFactor
        : { ...subjectFactor, score: null, shared: [], detail: 'Subject overlap is private; its weighted contribution is included in the overall score.' }
      const visibleGoalFactor = candidate.show_goals
        ? goalFactor
        : { ...goalFactor, score: null, shared: [], detail: 'Goal overlap is private; its weighted contribution is included in the overall score.' }
      const visiblePreferenceFactor = { ...preferenceFactor, shared: [] }
      const available = overlapScore(availabilityMap.get(userId)||[],availabilityMap.get(candidate.id)||[],now)
      const availabilityFactor = {
        score: Math.round(available.score*100), weight: weights.availability, shared: [],
        detail: available.overlapMinutes ? `About ${Math.round(available.overlapMinutes/60*10)/10} overlapping study hours in the next two weeks.` : 'No overlapping study times in the next two weeks.',
      }
      const compatibility = Math.round(subjectFactor.score*0.4+availabilityFactor.score*0.25+goalFactor.score*0.2+preferenceFactor.score*0.15)
      let avatarUrl: string | null = null
      if (candidate.avatar_path && candidate.show_avatar) {
        const { data } = await admin.storage.from('avatars').createSignedUrl(candidate.avatar_path,3600)
        avatarUrl = data?.signedUrl || null
      }
      return {
        id:candidate.id,full_name:candidate.full_name,
        university:candidate.show_university?candidate.university:null,degree:candidate.show_degree?candidate.degree:null,
        major:candidate.show_major?candidate.major:null,academic_year:candidate.show_academic_year?candidate.academic_year:null,
        semester:candidate.show_semester?candidate.semester:null,bio:candidate.show_bio?candidate.bio:null,
        avatar_url:avatarUrl,timezone_name:candidate.show_timezone?candidate.timezone_name:null,
        visibility:candidate.visibility,onboarding_completed:candidate.onboarding_completed,
        show_university:candidate.show_university,show_degree:candidate.show_degree,show_major:candidate.show_major,
        show_academic_year:candidate.show_academic_year,show_semester:candidate.show_semester,show_bio:candidate.show_bio,
        show_avatar:candidate.show_avatar,show_timezone:candidate.show_timezone,show_subjects:candidate.show_subjects,show_goals:candidate.show_goals,
        subjects:candidate.show_subjects?subjects:[],goals:candidate.show_goals?goals:[],compatibility_score:compatibility,
        factors:{subjects:visibleSubjectFactor,availability:availabilityFactor,goals:visibleGoalFactor,preferences:visiblePreferenceFactor},
      }
    }))
    matches.sort((a,b) => b.compatibility_score-a.compatibility_score || a.full_name.localeCompare(b.full_name))
    return new Response(JSON.stringify({matches:matches.slice(0,60)}),{headers:{...cors,'Content-Type':'application/json','Cache-Control':'private, no-store'}})
  } catch (error) {
    console.error('match-students failed',error)
    return new Response(JSON.stringify({error:'Could not calculate matches right now. Please try again.'}),{status:500,headers:{...cors,'Content-Type':'application/json','Cache-Control':'private, no-store'}})
  }
})
