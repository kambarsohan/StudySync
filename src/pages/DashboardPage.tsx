import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Bell, CalendarDays, Clock3, Compass, Plus, Sparkles, Users } from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider'
import { Avatar, Card, EmptyState, PageTitle } from '../components/ui'
import { getGroups, getMatches, getNotifications, getSessions } from '../lib/api'
import { formatWhen } from '../lib/utils'
import { StudentCard } from '../features/discover/StudentCard'

export function DashboardPage() {
  const { user, profile } = useAuth()
  const greetingName = profile?.full_name?.split(' ')[0] || 'there'
  const matches = useQuery({ queryKey: ['matches'], queryFn: getMatches })
  const groups = useQuery({ queryKey: ['groups'], queryFn: getGroups })
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: getSessions })
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: getNotifications })
  const nextSessions = (sessions.data || []).filter((session) => !session.canceled_at && new Date(session.starts_at) >= new Date()).slice(0,3)
  const unread = (notifications.data || []).filter((item) => !item.read_at).length

  return <div className="page-stack"><PageTitle eyebrow="YOUR STUDY SPACE" title={`Good to see you, ${greetingName}.`} description="A clear next step makes it easier to begin." action={<Link className="button button-primary" to="/planner"><Plus size={16} /> Plan a session</Link>} />
    <div className="dashboard-welcome"><div className="welcome-copy"><span className="eyebrow"><Sparkles size={14} /> A FRESH START, ONE SESSION AT A TIME</span><h2>What would you like to make progress on?</h2><p>Find a study partner, join a group or set a time for focused work.</p><div className="welcome-actions"><Link to="/discover" className="button button-primary">Find study buddies <ArrowRight size={15} /></Link><Link to="/groups" className="button button-secondary">Browse groups</Link></div></div><div className="welcome-illustration" aria-hidden="true"><div className="welcome-orbit orbit-a"/><div className="welcome-orbit orbit-b"/><div className="welcome-book"><span/><span/></div><div className="welcome-star star-a">✦</div><div className="welcome-star star-b">✦</div></div></div>
    <div className="dashboard-grid"><section className="dashboard-main-col"><div className="section-line"><div><p className="eyebrow">A GOOD FIT FOR YOU</p><h2>Study buddies</h2></div><Link to="/discover" className="text-link">See all <ArrowRight size={15} /></Link></div>
        {matches.isLoading ? <div className="loading-strip">Finding students with overlapping study goals…</div> : matches.isError ? <Card><EmptyState icon={<Compass size={20}/>} title="Matches are unavailable" body="Check your connection or try again in a moment." action={<button className="text-link" onClick={() => void matches.refetch()}>Retry <ArrowRight size={14}/></button>} /></Card> : matches.data?.length ? <div className="mini-match-grid">{matches.data.slice(0,2).map((student) => <StudentCard key={student.id} student={student} compact />)}</div> : <Card><EmptyState icon={<Compass size={20}/>} title="Your discovery list is ready to grow" body="As more students complete profiles, compatible study partners will show up here." action={<Link className="button button-secondary" to="/discover">Explore discovery</Link>} /></Card>}
      <div className="section-line section-line-spaced"><div><p className="eyebrow">ON THE CALENDAR</p><h2>Upcoming sessions</h2></div><Link to="/planner" className="text-link">Open planner <ArrowRight size={15} /></Link></div>
      {sessions.isLoading ? <div className="loading-strip">Loading your study plan…</div> : sessions.isError ? <Card className="inline-error">Could not load sessions. <button className="text-link" onClick={() => void sessions.refetch()}>Try again</button></Card> : nextSessions.length ? <div className="session-list">{nextSessions.map((session) => <Link className="session-row" to={`/sessions/${session.id}`} key={session.id}><span className="session-icon"><CalendarDays size={18}/></span><span className="session-row-info"><strong>{session.title}</strong><small><Clock3 size={13}/> {formatWhen(session.starts_at, profile?.timezone_name)}</small></span><ArrowRight size={16}/></Link>)}</div> : <Card><EmptyState icon={<CalendarDays size={20}/>} title="A little open space" body="There are no upcoming sessions yet. Choose a time and invite a study partner." action={<Link className="button button-secondary" to="/planner">Plan a study session</Link>} /></Card>}
      </section>
      <aside className="dashboard-side-col"><Card className="summary-card"><div className="summary-head"><span className="summary-icon"><Users size={18}/></span><span>Study groups</span><Link to="/groups" aria-label="Browse study groups"><ArrowRight size={15}/></Link></div><strong className="summary-number">{groups.isLoading ? '—' : groups.data?.length ?? 0}</strong><p>groups open to explore</p><Link to="/groups" className="summary-link">Find your circle <ArrowRight size={14}/></Link></Card>
      <Card className="summary-card"><div className="summary-head"><span className="summary-icon summary-icon-amber"><Bell size={17}/></span><span>Notifications</span></div><strong className="summary-number">{notifications.isLoading ? '—' : unread}</strong><p>unread updates</p><Link to="/notifications" className="summary-link">View activity <ArrowRight size={14}/></Link></Card>
      <Card className="profile-nudge"><Avatar name={profile?.full_name || user?.email} src={profile?.avatar_url} size="md"/><div><strong>Keep your profile current</strong><p>Better context can make a better match.</p></div><Link to="/profile" className="icon-button" aria-label="Edit profile"><ArrowRight size={16}/></Link></Card>
      <div className="dashboard-privacy"><span><Bell size={15}/></span><p>Connection requests need a yes. You’re always in control.</p><Link to="/settings">Privacy settings</Link></div></aside>
    </div>
  </div>
}
