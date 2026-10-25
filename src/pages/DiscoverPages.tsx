import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, Compass, LockKeyhole, Search, ShieldCheck, Sparkles, UserRoundPlus, UserX, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, Button, Card, EmptyState, PageTitle } from '../components/ui'
import { useAuth } from '../features/auth/AuthProvider'
import { StudentCard } from '../features/discover/StudentCard'
import { blockStudent, getConnections, getMatches, getStudentProfile, getVisibleProfiles, requestConnection, respondConnection, type ConnectionRow } from '../lib/api'
import type { StudentMatch } from '../lib/types'

function otherId(row: ConnectionRow, userId: string) { return row.user_low === userId ? row.user_high : row.user_low }

export function DiscoverPage() {
  const [search,setSearch] = useState('')
  const client = useQueryClient()
  const {user}=useAuth()
  const userId = user?.id || ''
  const matches = useQuery({queryKey:['matches'],queryFn:getMatches})
  const connections = useQuery({queryKey:['connections'],queryFn:getConnections})
  const connect = useMutation({mutationFn:requestConnection,onSuccess:async()=>{toast.success('Connection request sent.');await Promise.all([client.invalidateQueries({queryKey:['connections']}),client.invalidateQueries({queryKey:['matches']})])},onError:(error)=>toast.error(error instanceof Error?error.message:'Could not send the request.')})
  const block = useMutation({mutationFn:blockStudent,onSuccess:async()=>{toast.success('Student blocked.');await Promise.all([client.invalidateQueries({queryKey:['connections']}),client.invalidateQueries({queryKey:['matches']})])},onError:(error)=>toast.error(error instanceof Error?error.message:'Could not block this student.')})
  const relationshipAction = useMutation({mutationFn:({id,action}:{id:string;action:'cancel'|'unblock'})=>respondConnection(id,action),onSuccess:()=>client.invalidateQueries({queryKey:['connections']}),onError:(error)=>toast.error(error instanceof Error?error.message:'Could not update the connection.')})
  const visible = useMemo(()=> (matches.data||[]).filter((student)=>`${student.full_name} ${student.major||''} ${student.university||''} ${(student.subjects||[]).join(' ')}`.toLowerCase().includes(search.toLowerCase())),[matches.data,search])
  const relationFor = (id:string)=>connections.data?.find((row)=>(row.user_low===userId||row.user_high===userId)&&otherId(row,userId)===id)

  function connectionAction(student:StudentMatch) {
    if(!user)return <Link className="button button-secondary" to="/signup">Create an account to connect</Link>
    const row=relationFor(student.id)
    if (row?.status==='accepted') return <span className="state-pill state-accepted"><Check size={13}/> Connected</span>
    if (row?.status==='pending' && row.initiated_by===userId) return <Button variant="secondary" disabled={relationshipAction.isPending} onClick={()=>relationshipAction.mutate({id:row.id,action:'cancel'})}>Request sent</Button>
    if (row?.status==='pending') return <Link className="button button-secondary" to="/connections">Respond to request <ArrowRight size={14}/></Link>
    if (row?.status==='blocked' && row.blocked_by===userId) return <Button variant="secondary" onClick={()=>relationshipAction.mutate({id:row.id,action:'unblock'})}>Unblock</Button>
    if (row?.status==='blocked') return <span className="state-pill">Unavailable</span>
    return <Button onClick={()=>connect.mutate(student.id)} disabled={connect.isPending}><UserRoundPlus size={15}/> Connect</Button>
  }
  return <div className="page-stack"><PageTitle eyebrow="FIND YOUR PEOPLE" title="Study with a better fit." description="Every match is calculated from student profiles, shared subjects, schedules, goals and learning preferences." />
    <div className="notice notice-info discovery-explainer"><Compass size={17}/><span><strong>How compatibility works</strong> Subjects 40% · availability 25% · goals 20% · learning preferences 15%. You can see the explanation for every match.</span></div>
    <div className="discovery-toolbar"><label className="search-input"><Search size={17}/><input aria-label="Search students and subjects" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search by name, major or subject" /></label><span>{matches.data?.length ?? '—'} students</span></div>
    {matches.isLoading ? <div className="loading-strip">Calculating compatibility from student profiles…</div> : matches.isError ? <Card><EmptyState icon={<Compass size={20}/>} title="Discovery needs a connection" body="StudySync could not reach the matching service. Check Supabase setup and try again." action={<Button variant="secondary" onClick={()=>void matches.refetch()}>Try again</Button>}/></Card> : visible.length ? <div className="match-grid">{visible.map((student)=>{const row=relationFor(student.id);return <StudentCard key={student.id} student={student} action={<div className="card-actions">{connectionAction(student)}{user&&row?.status!=='blocked'&&<Button variant="ghost" className="icon-button" aria-label={`Block ${student.full_name}`} title="Block student" onClick={()=>{if(window.confirm(`Block ${student.full_name}? They will no longer appear in discovery.`)) block.mutate(student.id)}}><UserX size={16}/></Button>}</div>}/>})}</div> : <Card><EmptyState icon={<Users size={21}/>} title={search?'No students match that search':'No compatible profiles to show yet'} body={search?'Try a subject, university or a shorter name.':'As students with completed and discoverable profiles join, their real compatibility details will appear here.'}/></Card>}
  </div>
}

export function StudentProfilePage() {
  const {id=''}=useParams()
  const {user}=useAuth()
  const qc=useQueryClient()
  const profile=useQuery({queryKey:['student-profile',id],queryFn:()=>getStudentProfile(id),enabled:Boolean(id)})
  const connections=useQuery({queryKey:['connections'],queryFn:getConnections,enabled:Boolean(user?.id)})
  const connect=useMutation({mutationFn:requestConnection,onSuccess:async()=>{toast.success('Connection request sent.');await qc.invalidateQueries({queryKey:['connections']})},onError:(error)=>toast.error(error instanceof Error?error.message:'Could not send a request.')})
  const block=useMutation({mutationFn:blockStudent,onSuccess:async()=>{toast.success('Student blocked.');await Promise.all([qc.invalidateQueries({queryKey:['connections']}),qc.invalidateQueries({queryKey:['matches']})])},onError:(error)=>toast.error(error instanceof Error?error.message:'Could not block this student.')})
  const row=connections.data?.find((item)=>(item.user_low===user?.id||item.user_high===user?.id)&&otherId(item,user?.id||'')===id)
  if(profile.isLoading)return <div className="loading-strip">Opening student profile…</div>
  if(profile.isError||!profile.data)return <div className="page-stack"><PageTitle title="Profile unavailable" description="This profile may be private or no longer available."/><Card><EmptyState icon={<LockKeyhole size={20}/>} title="This profile isn’t visible" body="Students control their visibility. Only intentionally discoverable profiles can be viewed here." action={<Link className="button button-secondary" to={user?'/discover':'/'}>Back</Link>}/></Card></div>
  const student=profile.data
  return <div className="page-stack"><Link className="back-link" to={user?'/discover':'/'}><ArrowRight className="back-arrow" size={15}/> {user?'Back to discovery':'Back to StudySync'}</Link><Card className="profile-detail-card"><div className="profile-detail-top"><Avatar name={student.full_name} size="lg"/><div><p className="eyebrow">STUDENT PROFILE</p><h1>{student.full_name}</h1><p>{[student.major,student.university,student.academic_year].filter(Boolean).join(' · ')||'Student'}</p></div>{user&&user.id!==student.id&&<div className="profile-detail-actions">{row?.status==='accepted'?<span className="state-pill state-accepted"><Check size={14}/> Connected</span>:row?.status==='pending'?<span className="state-pill">Request pending</span>:row?.status==='blocked'?<span className="state-pill">Unavailable</span>:<Button onClick={()=>connect.mutate(student.id)} disabled={connect.isPending}><UserRoundPlus size={15}/> Send connection request</Button>}{row?.status!=='blocked'&&<Button variant="ghost" onClick={()=>{if(window.confirm(`Block ${student.full_name}?`)) block.mutate(student.id)}}><UserX size={15}/> Block</Button>}</div>}{!user&&<Link className="button button-primary" to="/signup">Create an account to connect</Link>}</div>
    {student.bio&&<section className="profile-section"><h2>About</h2><p>{student.bio}</p></section>}
    <div className="profile-facts">{student.degree&&<div><span>Program</span><strong>{student.degree}</strong></div>}{student.semester&&<div><span>Semester</span><strong>{student.semester}</strong></div>}{student.timezone_name&&<div><span>Time zone</span><strong>{student.timezone_name}</strong></div>}</div>
    {student.subjects.length>0&&<section className="profile-section"><h2>Subjects</h2><div className="student-tags">{student.subjects.map((item)=><span key={item.subject}>{item.is_priority&&<Sparkles size={12}/ >}{item.subject}</span>)}</div></section>}
    {student.goals.length>0&&<section className="profile-section"><h2>Study goals</h2><div className="student-tags">{student.goals.map((item)=><span key={item.goal}>{item.is_primary&&<Check size={12}/>} {item.label}</span>)}</div></section>}
    <div className="notice notice-info profile-privacy-note"><ShieldCheck size={16}/> This shareable profile shows academic information only. Personal contact details and exact availability are not public.</div>
  </Card></div>
}

export function ConnectionsPage() {
  const {user}=useAuth()
  const qc=useQueryClient()
  const rows=useQuery({queryKey:['connections'],queryFn:getConnections})
  const profiles=useQuery({queryKey:['connection-profiles',rows.data?.map((r)=>otherId(r,user?.id||'')).sort().join(',')],queryFn:()=>getVisibleProfiles([...new Set((rows.data||[]).map((r)=>otherId(r,user?.id||'')))]) ,enabled:Boolean(rows.data?.length)})
  const act=useMutation({mutationFn:({id,action}:{id:string;action:'accept'|'decline'|'cancel'|'block'|'unblock'})=>respondConnection(id,action),onSuccess:async()=>{toast.success('Connection updated.');await qc.invalidateQueries({queryKey:['connections']})},onError:(error)=>toast.error(error instanceof Error?error.message:'Could not update that connection.')})
  const profileMap=new Map((profiles.data||[]).map((p)=>[p.id,p]))
  const all=rows.data||[]
  const incoming=all.filter((row)=>row.status==='pending'&&row.initiated_by!==user?.id)
  const outgoing=all.filter((row)=>row.status==='pending'&&row.initiated_by===user?.id)
  const accepted=all.filter((row)=>row.status==='accepted')
  const blocked=all.filter((row)=>row.status==='blocked')
  const person=(row:ConnectionRow)=>profileMap.get(otherId(row,user?.id||''))
  const section=(title:string,list:ConnectionRow[],empty:string,render:(row:ConnectionRow)=>React.ReactNode)=><section className="connection-section"><div className="section-line"><h2>{title}</h2><span>{list.length}</span></div>{list.length?<div className="connection-list">{list.map((row)=>{const p=person(row);return <Card className="connection-row" key={row.id}><Avatar name={p?.full_name||'Student'} src={null} size="md"/><div className="connection-person"><strong>{p?.full_name||'Student profile'}</strong><small>{[p?.major,p?.university].filter(Boolean).join(' · ')||'Profile information is not shared'}</small></div><div className="connection-actions">{render(row)}</div></Card>})}</div>:<p className="connection-empty">{empty}</p>}</section>
  return <div className="page-stack"><PageTitle eyebrow="STUDY, BY MUTUAL CONSENT" title="Your connections." description="Requests are only the beginning. Both students choose when a connection starts." />
    {rows.isError?<Card><EmptyState title="Could not load connections" body="Check your connection and try again." action={<Button variant="secondary" onClick={()=>void rows.refetch()}>Retry</Button>}/></Card>:rows.isLoading?<div className="loading-strip">Loading connection requests…</div>:<>
      {section('Incoming requests',incoming,'No new requests right now.',(row)=><><Button onClick={()=>act.mutate({id:row.id,action:'accept'})} disabled={act.isPending}><Check size={15}/> Accept</Button><Button variant="secondary" onClick={()=>act.mutate({id:row.id,action:'decline'})} disabled={act.isPending}>Decline</Button><Button variant="ghost" aria-label="Block this student" onClick={()=>act.mutate({id:row.id,action:'block'})}><UserX size={15}/></Button></>)}
      {section('Requests you sent',outgoing,'You have no pending outgoing requests.',(row)=><><span className="state-pill">Waiting for a response</span><Button variant="secondary" onClick={()=>act.mutate({id:row.id,action:'cancel'})} disabled={act.isPending}>Cancel</Button><Button variant="ghost" aria-label="Block this student" onClick={()=>act.mutate({id:row.id,action:'block'})}><UserX size={15}/></Button></>)}
      {section('Connected students',accepted,'Accepted connections will appear here.',(row)=><><Link className="button button-secondary" to={`/students/${otherId(row,user?.id||'')}`}>View profile <ArrowRight size={14}/></Link><Button variant="ghost" onClick={()=>{if(window.confirm('Block this student and remove the connection?'))act.mutate({id:row.id,action:'block'})}}><UserX size={15}/> Block</Button></>)}
      {section('Blocked students',blocked,'You have not blocked any students.',(row)=><>{row.blocked_by===user?.id?<Button variant="secondary" onClick={()=>act.mutate({id:row.id,action:'unblock'})}>Unblock</Button>:<span className="state-pill">You cannot change this block</span>}</>)}
    </>}
    <div className="privacy-inline"><ShieldCheck size={16}/><span>Connection details are visible only to the students involved.</span></div>
  </div>
}
