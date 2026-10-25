import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addHours, format } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CalendarDays, Check, Clock3, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, Button, Card, EmptyState, Field, PageTitle, TextareaField } from '../components/ui'
import { useAuth } from '../features/auth/AuthProvider'
import { cancelSession, createSession, getConnections, getGroupsByIds, getMyMemberships, getMySessionInvitations, getProfilesByIds, getSession, getSessions, respondSessionInvite, type ConnectionRow, type StudySession } from '../lib/api'
import { localDateTimeToIso, formatWhen } from '../lib/utils'

function otherId(row:ConnectionRow,userId:string){return row.user_low===userId?row.user_high:row.user_low}
function localInputValue(date:Date,zone:string){try{return formatInTimeZone(date,zone,"yyyy-MM-dd'T'HH:mm")}catch{return format(date,"yyyy-MM-dd'T'HH:mm")}}

export function PlannerPage(){
  const {user,profile}=useAuth()
  const qc=useQueryClient()
  const navigate=useNavigate()
  const zone=profile?.timezone_name||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'
  const startDefault=useMemo(()=>localInputValue(addHours(new Date(),2),zone),[zone])
  const [title,setTitle]=useState('')
  const [description,setDescription]=useState('')
  const [startsAt,setStartsAt]=useState(startDefault)
  const [endsAt,setEndsAt]=useState(localInputValue(addHours(new Date(),3),zone))
  const [groupId,setGroupId]=useState('')
  const [invitees,setInvitees]=useState<string[]>([])
  const [error,setError]=useState('')
  const connections=useQuery({queryKey:['connections'],queryFn:getConnections})
  const sessions=useQuery({queryKey:['sessions'],queryFn:getSessions})
  const invitations=useQuery({queryKey:['my-session-invitations',user?.id],queryFn:()=>getMySessionInvitations(user!.id),enabled:Boolean(user?.id)})
  const memberships=useQuery({queryKey:['my-memberships',user?.id],queryFn:()=>getMyMemberships(user!.id),enabled:Boolean(user?.id)})
  const myGroupIds=(memberships.data||[]).filter((m)=>m.status==='active').map((m)=>m.group_id)
  const myGroups=useQuery({queryKey:['planner-groups',myGroupIds.join(',')],queryFn:()=>getGroupsByIds(myGroupIds),enabled:Boolean(myGroupIds.length)})
  const confirmed=(connections.data||[]).filter((row)=>row.status==='accepted').map((row)=>otherId(row,user?.id||''))
  const friends=useQuery({queryKey:['planner-friends',confirmed.join(',')],queryFn:()=>getProfilesByIds(confirmed),enabled:Boolean(confirmed.length)})
  const create=useMutation({mutationFn:createSession,onSuccess:async(id)=>{toast.success('Study session scheduled and invitations sent.');setTitle('');setDescription('');setInvitees([]);await Promise.all([qc.invalidateQueries({queryKey:['sessions']}),qc.invalidateQueries({queryKey:['notifications']})]);navigate(`/sessions/${id}`)},onError:(cause)=>setError(cause instanceof Error?cause.message:'Could not schedule your session.')})
  const reply=useMutation({mutationFn:({id,action}:{id:string;action:'accept'|'decline'})=>respondSessionInvite(id,action),onSuccess:async()=>{toast.success('Invitation updated.');await Promise.all([qc.invalidateQueries({queryKey:['sessions']}),qc.invalidateQueries({queryKey:['my-session-invitations']}),qc.invalidateQueries({queryKey:['notifications']})])},onError:(cause)=>toast.error(cause instanceof Error?cause.message:'Could not update invitation.')})
  const sessionNames=new Map((sessions.data||[]).map((session)=>[session.id,session]))
  const future=(sessions.data||[]).filter((session)=>!session.canceled_at&&new Date(session.ends_at)>=new Date()).sort((a,b)=>a.starts_at.localeCompare(b.starts_at))
  const pendingInvites=(invitations.data||[]).filter((invite)=>invite.status==='pending'&&sessionNames.has(invite.session_id))

  function submit(event:React.FormEvent){event.preventDefault();setError('');if(title.trim().length<3)return setError('Choose a session title of at least 3 characters.');if(!groupId&&!invitees.length)return setError('Choose a study group or at least one accepted connection to invite.');try{const start=localDateTimeToIso(startsAt,zone);const end=localDateTimeToIso(endsAt,zone);if(new Date(end)<=new Date(start))return setError('The session must end after it starts.');create.mutate({title:title.trim(),description,groupId:groupId||null,startsAt:start,endsAt:end,timezone:zone,invitees})}catch(cause){setError(cause instanceof Error?cause.message:'Choose valid session times.')}}
  return <div className="page-stack"><PageTitle eyebrow="MAKE A PLAN THAT FITS" title="Study planner." description="Set a time in your local zone and invite accepted connections or the members of one of your groups." />
    <div className="planner-layout"><Card className="planner-form-card"><div className="section-line"><div><p className="eyebrow">SCHEDULE TOGETHER</p><h2>Plan a session</h2></div><span className="zone-pill"><Clock3 size={13}/>{zone}</span></div><form className="form-stack" onSubmit={submit}><Field label="Session title" name="title" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="e.g. Data Structures practice" maxLength={120} required/><TextareaField label="What will you work on?" name="description" value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Add a topic or a short agenda" maxLength={1000}/><div className="date-range-fields"><Field label="Starts" type="datetime-local" name="starts_at" value={startsAt} onChange={(e)=>setStartsAt(e.target.value)} required/><Field label="Ends" type="datetime-local" name="ends_at" value={endsAt} onChange={(e)=>setEndsAt(e.target.value)} required/></div><div className="field"><label htmlFor="planner-group">Study group (optional)</label><select id="planner-group" value={groupId} onChange={(e)=>{setGroupId(e.target.value);setInvitees([])}}><option value="">Invite individual connections</option>{(myGroups.data||[]).map((group)=><option value={group.id} key={group.id}>{group.title}</option>)}</select><span className="field-hint">Selecting a group invites its active members.</span></div>{!groupId&&<fieldset className="invite-fieldset"><legend>Invite accepted connections</legend>{friends.isLoading?<span className="field-hint">Loading connections…</span>:friends.data?.length?friends.data.map((friend)=><label className="checkbox-row" key={friend.id}><input type="checkbox" checked={invitees.includes(friend.id)} onChange={()=>setInvitees((current)=>current.includes(friend.id)?current.filter((id)=>id!==friend.id):[...current,friend.id])}/><Avatar name={friend.full_name} size="sm"/><span>{friend.full_name} <small>{friend.major||friend.university||''}</small></span></label>):<span className="field-hint">You need an accepted connection to invite someone individually.</span>}</fieldset>}{error&&<div className="notice notice-error" role="alert">{error}</div>}<div className="notice notice-info"><Clock3 size={15}/> Stored as an absolute time and shown to invitees in their own local time zone.</div><Button type="submit" disabled={create.isPending}>{create.isPending?'Scheduling…':'Schedule study session'} <ArrowRight size={15}/></Button></form></Card>
      <aside className="planner-side"><Card><div className="section-line"><div><p className="eyebrow">YOUR STUDY CALENDAR</p><h2>Upcoming</h2></div><CalendarDays size={18}/></div>{sessions.isLoading?<p className="connection-empty">Loading sessions…</p>:future.length?future.map((session)=><SessionListRow key={session.id} session={session} zone={zone}/>):<EmptyState icon={<CalendarDays size={20}/>} title="No sessions planned" body="A little focused time is a good next step."/>}</Card>
      {pendingInvites.length>0&&<Card><div className="section-line"><div><p className="eyebrow">YOUR INBOX</p><h2>Invitations</h2></div><span>{pendingInvites.length}</span></div>{pendingInvites.map((invite)=>{const session=sessionNames.get(invite.session_id)!;return <div className="invite-card" key={invite.id}><Link to={`/sessions/${session.id}`}><strong>{session.title}</strong></Link><small>{formatWhen(session.starts_at,zone)}</small><div><Button onClick={()=>reply.mutate({id:invite.id,action:'accept'})} disabled={reply.isPending}><Check size={14}/> Accept</Button><Button variant="secondary" onClick={()=>reply.mutate({id:invite.id,action:'decline'})} disabled={reply.isPending}>Decline</Button></div></div>})}</Card>}</aside></div>
  </div>
}

function SessionListRow({session,zone}:{session:StudySession;zone:string}){return <Link className="session-row" to={`/sessions/${session.id}`}><span className="session-icon"><CalendarDays size={17}/></span><span className="session-row-info"><strong>{session.title}</strong><small>{formatWhen(session.starts_at,zone)}</small></span><ArrowRight size={15}/></Link>}

export function SessionDetailPage(){
  const {id=''}=useParams()
  const {user,profile}=useAuth()
  const qc=useQueryClient()
  const result=useQuery({queryKey:['session',id],queryFn:()=>getSession(id),enabled:Boolean(id)})
  const reply=useMutation({mutationFn:(action:'accept'|'decline')=>respondSessionInvite(result.data?.invitations.find((item)=>item.user_id===user?.id)?.id||'',action),onSuccess:async()=>{toast.success('Your response was saved.');await Promise.all([qc.invalidateQueries({queryKey:['session',id]}),qc.invalidateQueries({queryKey:['sessions']}),qc.invalidateQueries({queryKey:['notifications']})])},onError:(cause)=>toast.error(cause instanceof Error?cause.message:'Could not respond to this invitation.')})
  const cancel=useMutation({mutationFn:()=>cancelSession(id),onSuccess:async()=>{toast.success('Session cancelled.');await Promise.all([qc.invalidateQueries({queryKey:['session',id]}),qc.invalidateQueries({queryKey:['sessions']})])},onError:(cause)=>toast.error(cause instanceof Error?cause.message:'Could not cancel this session.')})
  if(result.isLoading)return <div className="loading-strip">Loading study session…</div>
  if(result.isError||!result.data)return <div className="page-stack"><PageTitle title="Session unavailable" description="This session may have been cancelled or is not shared with your account."/><Link className="button button-secondary" to="/planner">Back to planner</Link></div>
  const {session,invitations}=result.data
  const owner=session.creator_id===user?.id
  const mine=invitations.find((item)=>item.user_id===user?.id)
  return <div className="page-stack"><Link className="back-link" to="/planner"><ArrowRight className="back-arrow" size={15}/> Back to planner</Link><Card className="session-detail-card"><p className="eyebrow">STUDY SESSION</p><h1>{session.title}</h1>{session.description&&<p className="session-description">{session.description}</p>}<div className="session-time-block"><CalendarDays size={18}/><div><strong>{formatWhen(session.starts_at,profile?.timezone_name)}</strong><span>Until {formatWhen(session.ends_at,profile?.timezone_name)}</span></div></div>{session.canceled_at&&<div className="notice notice-error">This session was cancelled.</div>}{mine?.status==='pending'&&<div className="invite-actions"><span>You’re invited to this session.</span><Button onClick={()=>reply.mutate('accept')} disabled={reply.isPending}><Check size={14}/> Accept invitation</Button><Button variant="secondary" onClick={()=>reply.mutate('decline')} disabled={reply.isPending}>Decline</Button></div>}{mine?.status==='accepted'&&<div className="state-pill state-accepted"><Check size={13}/> You’re attending</div>}{owner&&<div className="invite-status-list"><h2>Invitations</h2>{invitations.length?invitations.map((invite)=><div className="member-row" key={invite.id}><span>Study participant</span><span className={`state-pill ${invite.status==='accepted'?'state-accepted':''}`}>{invite.status}</span></div>):<p>No invitations were sent.</p>}</div>}{owner&&!session.canceled_at&&<Button variant="danger" onClick={()=>{if(window.confirm('Cancel this session and notify its invitees?'))cancel.mutate()}} disabled={cancel.isPending}>Cancel session</Button>}<div className="privacy-inline"><Users size={15}/><span>Invitations are limited to accepted connections or active members of the selected study group.</span></div></Card></div>
}
