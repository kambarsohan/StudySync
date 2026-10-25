import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Clock3, Sparkles } from 'lucide-react'
import { Avatar, Card } from '../../components/ui'
import type { StudentMatch } from '../../lib/types'

export function StudentCard({ student, compact = false, action }: { student: StudentMatch; compact?: boolean; action?: React.ReactNode }) {
  const factorList = [student.factors.subjects, student.factors.availability, student.factors.goals, student.factors.preferences]
  return <Card className={`student-card ${compact ? 'student-card-compact' : ''}`}>
    <div className="student-card-top"><Avatar name={student.full_name} src={student.avatar_url} size={compact ? 'md' : 'lg'} /><div className="compatibility-score"><span>{Math.round(student.compatibility_score)}%</span><small>fit</small></div></div>
    <Link className="student-name" to={`/students/${student.id}`}>{student.full_name}</Link><p className="student-subline">{[student.major,student.university].filter(Boolean).join(' · ') || 'Student'}</p>
    {student.bio && <p className="student-bio">{student.bio}</p>}
    {student.subjects?.length > 0 && <div className="student-tags">{student.subjects.slice(0,3).map((subject) => <span key={subject}><BookOpen size={12}/>{subject}</span>)}</div>}
    <div className="match-breakdown"><span><Sparkles size={13}/> Match details · weighted score</span><div>{factorList.map((factor,index) => <div className="match-factor" key={index}><div className="factor-head"><span>{['Subjects','Availability','Goals','Study style'][index]} <small>{factor.weight}% of score</small></span><b>{factor.score===null?'Private':`${Math.round(factor.score)}%`}</b></div><div className={`factor-track ${factor.score===null?'factor-track-private':''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={factor.score===null?undefined:factor.score} aria-valuetext={factor.score===null?'Private':`${factor.score}%`}><i style={{ width: factor.score===null?'0%':`${Math.max(0,Math.min(100,factor.score))}%` }} /></div><small className="match-detail">{factor.detail}</small></div>)}</div></div>
    <div className="student-card-footer"><span className="student-tz"><Clock3 size={13}/>{student.timezone_name || 'Time zone private'}</span>{action || <Link to={`/students/${student.id}`} className="text-link">View profile <ArrowRight size={14}/></Link>}</div>
  </Card>
}
