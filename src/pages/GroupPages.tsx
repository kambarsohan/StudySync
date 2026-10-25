import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, Search, ShieldCheck, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, Button, Card, EmptyState, Field, PageTitle, TextareaField } from '../components/ui'
import { useAuth } from '../features/auth/AuthProvider'
import { createGroup, getGroup, getGroups, getMyMemberships, getVisibleProfiles, requestGroupMembership, respondGroupMembership } from '../lib/api'

export function GroupsPage() {
  const {user}=useAuth()
  const [search,setSearch]=useState('')
  const qc=useQueryClient()
  const groups=useQuery({queryKey:['groups'],queryFn:getGroups})
  const memberships=useQuery({queryKey:['my-memberships',user?.id],queryFn:()=>getMyMemberships(user!.id),enabled:Boolean(user?.id)})
  const request=useMutation({mutationFn:requestGroupMembership,onSuccess:async()=>{toast.success('Membership request sent to the group owner.');await qc.invalidateQueries({queryKey:['my-memberships']})},onError:(error)=>toast.error(error instanceof Error?error.message:'Could not request membership.')})
  const filtered=useMemo(()=> (groups.data||[]).filter((group)=>`${group.title} ${group.subject} ${group.goal}`.toLowerCase().includes(search.toLowerCase())),[groups.data,search])
  const own=(memberships.data||[])
  function groupAction(id:string){const state=own.find((item)=>item.group_id===id);if(state?.status==='active')return <span className="state-pill state-accepted"><Check size={13}/> Member</span>;if(state?.status==='pending')return <span className="state-pill">Request pending</span>;return <Button onClick={()=>request.mutate(id)} disabled={request.isPending}>Request to join <ArrowRight size={14}/></Button>}
  return <div className="page-stack"><PageTitle eyebrow="SMALL GROUPS, SHARED MOMENTUM" title="Find your study circle." description="Browse groups around a subject or goal, or make a focused space of your own." action={<Link className="button button-primary" to="/groups/create">Create a group <ArrowRight size={15}/></Link>} />
    <label className="search-input group-search"><Search size={17}/><input aria-label="Search study groups" placeholder="Search groups by subject or goal" value={search} onChange={(e)=>setSearch(e.target.value)}/></label>
    {groups.isLoading?<div className="loading-strip">Loading study groups…</div>:groups.isError?<Card><EmptyState title="Could not load groups" body="Check your connection and try again." action={<Button variant="secondary" onClick={()=>void groups.refetch()}>Retry</Button>}/></Card>:filtered.length?<div className="group-grid">{filtered.map((group)=><Card className="group-card" key={group.id}><div className="group-card-top"><span className="group-topic">{group.subject}</span><span className="group-capacity"><Users size={14}/>{group.capacity} max</span></div><h2><Link to={`/groups/${group.id}`}>{group.title}</Link></h2><p>{group.description||'A focused space to study together.'}</p><div className="group-goal"><span>Working toward</span><strong>{group.goal}</strong></div><div className="group-card-footer"><span className="group-status">{group.visibility==='public'?'Open group':'Private group'}</span>{groupAction(group.id)}</div></Card>)}</div>:<Card><EmptyState icon={<Users size={21}/>} title={search?'No groups match that search':'No open study groups yet'} body={search?'Try a different subject or goal.':'Create a focused group around a subject, exam or project.'} action={<Link className="button button-primary" to="/groups/create">Create the first group</Link>}/></Card>}
    <div className="privacy-inline"><ShieldCheck size={16}/><span>Membership requests go to the group owner. Capacity is checked again when a request is approved.</span></div>
  </div>
}

export function CreateGroupPage(){
  const {user}=useAuth()
  const navigate=useNavigate()
  const qc=useQueryClient()
  const [values,setValues]=useState({title:'',description:'',subject:'',goal:'',capacity:8})
  const [error,setError]=useState('')
  const create=useMutation({mutationFn:createGroup,onSuccess:async(id)=>{toast.success('Your study group is ready.');await qc.invalidateQueries({queryKey:['groups']});await qc.invalidateQueries({queryKey:['my-memberships']});navigate(`/groups/${id}`)},onError:(cause)=>setError(cause instanceof Error?cause.message:'Could not create this group.')})
  const change=(key:keyof typeof values,value:string|number)=>setValues((current)=>({...current,[key]:value}))
  function submit(event:React.FormEvent){event.preventDefault();setError('');if(values.title.trim().length<3)return setError('Give your group a title of at least 3 characters.');if(!values.subject.trim()||!values.goal.trim())return setError('Add a subject and a shared goal.');if(values.capacity<2||values.capacity>100)return setError('Group capacity must be between 2 and 100.');create.mutate({...values,visibility:'public'})}
  return <div className="page-stack narrow-page"><Link className="back-link" to="/groups"><ArrowRight className="back-arrow" size={15}/> Back to groups</Link><PageTitle eyebrow="START WITH A SHARED GOAL" title="Create a study group." description="Keep the purpose clear so the right students know what they’re joining."/><Card className="form-card"><form className="form-stack" onSubmit={submit}><Field label="Group name" name="title" maxLength={100} value={values.title} onChange={(e)=>change('title',e.target.value)} placeholder="e.g. Data Structures problem-solving" required/><Field label="Subject" name="subject" maxLength={100} value={values.subject} onChange={(e)=>change('subject',e.target.value)} placeholder="e.g. Data Structures" required/><Field label="Shared goal" name="goal" maxLength={100} value={values.goal} onChange={(e)=>change('goal',e.target.value)} placeholder="e.g. Finish weekly practice problems" required/><TextareaField label="About this group" name="description" maxLength={1000} value={values.description} onChange={(e)=>change('description',e.target.value)} placeholder="What will you work on together?"/><Field label="Group capacity" type="number" name="capacity" min={2} max={100} value={values.capacity} onChange={(e)=>change('capacity',Number(e.target.value) || 2)} hint="Between 2 and 100 students. The owner is included in the limit."/><div className="notice notice-info"><Users size={16}/> New groups are searchable by students. Membership requests require your approval.</div>{error&&<div className="notice notice-error" role="alert">{error}</div>}<Button type="submit" disabled={!user||create.isPending}>{create.isPending?'Creating group…':'Create study group'} <ArrowRight size={15}/></Button></form></Card></div>
}

export function GroupDetailPage(){
  const {id=''}=useParams()
  const {user}=useAuth()
  const qc=useQueryClient()
  const result=useQuery({queryKey:['group',id],queryFn:()=>getGroup(id),enabled:Boolean(id)})
  const group=result.data?.group
  const memberships=result.data?.memberships||[]
  const isOwner=Boolean(group&&user?.id===group.owner_id)
  const mine=memberships.find((item)=>item.user_id===user?.id)
  const visibleMemberships=memberships.filter((m)=>m.status==='active'||(isOwner&&m.status==='pending'))
  const profileQuery=useQuery({queryKey:['group-member-profiles',visibleMemberships.map((m)=>m.user_id).sort().join(',')],queryFn:()=>getVisibleProfiles(visibleMemberships.map((m)=>m.user_id)),enabled:Boolean(visibleMemberships.length)})
  const people=new Map((profileQuery.data||[]).map((person)=>[person.id,person]))
  const act=useMutation({mutationFn:({member,action}:{member:string;action:'approve'|'decline'|'cancel'|'remove'|'leave'})=>respondGroupMembership(id,member,action),onSuccess:async()=>{toast.success('Membership updated.');await Promise.all([qc.invalidateQueries({queryKey:['group',id]}),qc.invalidateQueries({queryKey:['my-memberships']})])},onError:(error)=>toast.error(error instanceof Error?error.message:'Could not update group membership.')})
  const join=useMutation({mutationFn:()=>requestGroupMembership(id),onSuccess:async()=>{toast.success('Request sent to the group owner.');await Promise.all([qc.invalidateQueries({queryKey:['group',id]}),qc.invalidateQueries({queryKey:['my-memberships']})])},onError:(error)=>toast.error(error instanceof Error?error.message:'Could not request membership.')})
  if(result.isLoading)return <div className="loading-strip">Opening study group…</div>
  if(result.isError||!group)return <div className="page-stack"><PageTitle title="Group unavailable" description="This group may have been removed or is not open to your account."/><Link className="button button-secondary" to="/groups">Back to groups</Link></div>
  const active=memberships.filter((m)=>m.status==='active')
  const pending=memberships.filter((m)=>m.status==='pending')
  return <div className="page-stack"><Link className="back-link" to="/groups"><ArrowRight className="back-arrow" size={15}/> Back to groups</Link><Card className="group-detail-hero"><div className="group-card-top"><span className="group-topic">{group.subject}</span><span className="group-capacity"><Users size={14}/>{active.length} / {group.capacity}</span></div><p className="eyebrow">STUDY GROUP</p><h1>{group.title}</h1><p className="group-detail-description">{group.description||'A focused space to study together.'}</p><div className="group-goal"><span>Shared goal</span><strong>{group.goal}</strong></div>{!isOwner&&(!mine||mine.status==='declined'||mine.status==='cancelled')&&<Button onClick={()=>join.mutate()} disabled={join.isPending}>Request to join <ArrowRight size={14}/></Button>}{mine?.status==='pending'&&<div className="notice notice-info">Your membership request is waiting for the owner.</div>}{mine?.status==='active'&&!isOwner&&<Button variant="secondary" onClick={()=>{if(window.confirm('Leave this study group?'))act.mutate({member:user!.id,action:'leave'})}}>Leave group</Button>}</Card>
    <section className="group-detail-section"><div className="section-line"><div><p className="eyebrow">THE STUDY CIRCLE</p><h2>Members</h2></div><span>{active.length} / {group.capacity}</span></div><div className="member-list">{active.map((member)=>{const person=people.get(member.user_id);return <div className="member-row" key={member.user_id}><Avatar name={person?.full_name||'Study member'} size="sm"/><span>{person?.full_name||'Study member'}</span>{group.owner_id===member.user_id&&<span className="owner-pill">Owner</span>}{isOwner&&member.user_id!==user?.id&&<Button variant="ghost" onClick={()=>{if(window.confirm(`Remove ${person?.full_name||'this member'} from the group?`))act.mutate({member:member.user_id,action:'remove'})}}>Remove</Button>}</div>})}</div></section>
    {isOwner&&<section className="group-detail-section"><div className="section-line"><div><p className="eyebrow">OWNER CONTROLS</p><h2>Membership requests</h2></div><span>{pending.length} pending</span></div>{pending.length?<div className="member-list">{pending.map((member)=>{const person=people.get(member.user_id);return <div className="member-row" key={member.user_id}><Avatar name={person?.full_name||'Student'} size="sm"/><span>{person?.full_name||'Student request'}</span><Button onClick={()=>act.mutate({member:member.user_id,action:'approve'})} disabled={act.isPending}><Check size={14}/> Approve</Button><Button variant="secondary" onClick={()=>act.mutate({member:member.user_id,action:'decline'})} disabled={act.isPending}>Decline</Button></div>})}</div>:<p className="connection-empty">No pending membership requests.</p>}</section>}
    <div className="privacy-inline"><ShieldCheck size={16}/><span>Group members see only the profile details each student has chosen to share.</span></div>
  </div>
}
