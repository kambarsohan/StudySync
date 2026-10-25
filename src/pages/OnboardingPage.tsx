import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check, Clock3, Plus, Search, ShieldCheck, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Brand } from '../components/Brand'
import { Button, Card, Field, SelectField, TextareaField } from '../components/ui'
import { useAuth } from '../features/auth/AuthProvider'
import { getMyProfileBundle, saveOnboarding, uploadAvatar } from '../lib/api'
import { LEARNING_PREFERENCES, STUDY_GOALS, SUBJECT_SUGGESTIONS, WEEKDAYS } from '../lib/types'
import type { OnboardingPayload } from '../lib/api'

type AvailabilityDraft = { weekday: number; start_time: string; end_time: string }
type Draft = {
  full_name: string; university: string; degree: string; major: string; academic_year: string; semester: string; bio: string; timezone_name: string;
  subjects: { name: string; priority: boolean }[]; preferences: string[]; collaboration_format: 'one_to_one' | 'small_group' | 'either';
  goals: { code: string; label: string; primary: boolean }[]; availability: AvailabilityDraft[];
}
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const timeZoneSuggestions = [...new Set([timeZone,'UTC','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Europe/London','Europe/Paris','America/New_York','America/Los_Angeles','Australia/Sydney'])]
const steps = ['Academic profile', 'Subjects', 'Learning style', 'Goals', 'Availability']

export function OnboardingPage() {
  const { user, profile, setProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEditing = searchParams.get('edit') === '1'
  const existing = useQuery({ queryKey: ['my-profile-bundle', user?.id], queryFn: () => getMyProfileBundle(user!.id), enabled: isEditing && Boolean(user?.id) })
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Draft>(() => ({
    full_name: profile?.full_name || String(user?.user_metadata?.full_name || ''),
    university: profile?.university || '', degree: profile?.degree || '', major: profile?.major || '',
    academic_year: profile?.academic_year || '', semester: profile?.semester || '', bio: profile?.bio || '', timezone_name: profile?.timezone_name || timeZone,
    subjects: [], preferences: [], collaboration_format: 'either', goals: [], availability: [],
  }))
  const userTimeZone = draft.timezone_name.trim()
  const filteredSubjects = useMemo(() => SUBJECT_SUGGESTIONS.filter((name) => name.toLowerCase().includes(search.toLowerCase())), [search])
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    if (!isEditing || !existing.data) return
    const { profile: current, subjects, preferences, goals, availability } = existing.data
    setDraft({
      full_name: current.full_name || '', university: current.university || '', degree: current.degree || '', major: current.major || '',
      academic_year: current.academic_year || '', semester: current.semester || '', bio: current.bio || '', timezone_name: current.timezone_name || timeZone,
      subjects: subjects.map((item) => ({ name: item.subject, priority: item.is_priority })), preferences,
      collaboration_format: current.collaboration_format || 'either',
      goals: goals.map((item) => ({ code: item.goal, label: item.label, primary: item.is_primary })),
      availability: availability.map((item) => ({ weekday: item.weekday, start_time: item.start_time, end_time: item.end_time })),
    })
  }, [existing.data, isEditing])

  function toggleSubject(name: string) {
    const normalized = name.trim().toLowerCase()
    if (!normalized || normalized.length > 100) { setError('Each subject must contain between 1 and 100 characters.'); return }
    const existing = draft.subjects.find((item) => item.name.trim().toLowerCase() === normalized)
    if (!existing && draft.subjects.length >= 40) { setError('Choose up to 40 subjects.'); return }
    setError('')
    update('subjects', existing ? draft.subjects.filter((item) => item.name.trim().toLowerCase() !== normalized) : [...draft.subjects, { name: name.trim(), priority: false }])
  }
  function addCustomSubject() {
    const name = customSubject.trim()
    if (!name) return
    if (name.length > 100) { setError('Subjects must be 100 characters or fewer.'); return }
    if (draft.subjects.some((item) => item.name.trim().toLowerCase() === name.toLowerCase())) { setError('That subject is already selected.'); return }
    if (draft.subjects.length >= 40) { setError('Choose up to 40 subjects.'); return }
    setError('')
    update('subjects', [...draft.subjects, { name, priority: false }])
    setCustomSubject('')
  }
  function togglePreference(value: string) {
    update('preferences', draft.preferences.includes(value) ? draft.preferences.filter((item) => item !== value) : [...draft.preferences, value])
  }
  function toggleGoal(value: string, label: string) {
    const present = draft.goals.some((item) => item.code === value)
    const next = present ? draft.goals.filter((item) => item.code !== value) : [...draft.goals, { code: value, label, primary: draft.goals.length === 0 }]
    if (present && draft.goals.find((item) => item.code === value)?.primary && next.length) next[0].primary = true
    update('goals', next)
  }
  function setPrimaryGoal(value: string) { update('goals', draft.goals.map((item) => ({ ...item, primary: item.code === value }))) }
  function addAvailability() {
    if (draft.availability.length >= 42) { setError('Add no more than 42 availability windows.'); return }
    setError('')
    update('availability', [...draft.availability, { weekday: 1, start_time: '16:00', end_time: '18:00' }])
  }

  function nextStep() {
    setError('')
    if (step === 0 && draft.full_name.trim().length < 2) return setError('Add your full name to continue.')
    if (step === 1 && draft.subjects.length === 0) return setError('Choose at least one subject so StudySync can find relevant partners.')
    if (step === 2 && draft.preferences.length === 0) return setError('Choose at least one way you like to study.')
    if (step === 3 && !draft.goals.length) return setError('Choose at least one study goal.')
    if (step < steps.length - 1) setStep(step + 1)
    else void finish()
  }

  async function finish() {
    if (!user) return
    if (!draft.availability.length) { setError('Add at least one day and time range.'); return }
    if (draft.availability.some((item) => !item.start_time || !item.end_time || item.end_time <= item.start_time)) { setError('Each availability range must end after it starts.'); return }
    try { new Intl.DateTimeFormat('en-US',{timeZone:userTimeZone}).format(new Date()) } catch { setError('Choose a valid IANA time zone, such as Asia/Kolkata or Europe/London.'); return }
    setBusy(true); setError('')
    try {
      const avatarPath = avatar ? await uploadAvatar(user.id, avatar) : existing.data?.profile.avatar_path || profile?.avatar_path || null
      const payload: OnboardingPayload = {
        profile: {
          full_name: draft.full_name.trim(), university: draft.university.trim(), degree: draft.degree.trim(),
          major: draft.major.trim(), academic_year: draft.academic_year, semester: draft.semester.trim(),
          bio: draft.bio.trim(), timezone_name: userTimeZone, avatar_path: avatarPath,
          collaboration_format: draft.collaboration_format, visibility: existing.data?.profile.visibility || profile?.visibility || 'discoverable',
        },
        subjects: draft.subjects,
        preferences: draft.preferences,
        goals: draft.goals,
        availability: draft.availability.map((item) => ({ ...item, timezone_name: userTimeZone })),
      }
      await saveOnboarding(payload)
      const refreshed = await refreshProfile()
      if (refreshed) setProfile(refreshed)
      toast.success(isEditing ? 'Your study profile was updated.' : 'Your study profile is ready.')
      navigate(isEditing ? '/profile' : '/dashboard', { replace: true })
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save your profile. Please try again.'
      setError(message)
    } finally { setBusy(false) }
  }

  if (isEditing && existing.isLoading) return <main className="center-screen"><Card className="loading-card"><span>Loading your study preferences…</span></Card></main>
  if (isEditing && existing.isError) return <main className="center-screen"><Card className="loading-card"><span>Your study preferences could not be loaded.</span><Button variant="secondary" onClick={() => void existing.refetch()}>Try again</Button><Link className="text-link" to="/profile">Back to profile</Link></Card></main>
  return <main className="onboarding-page"><header className="onboarding-header"><Brand /><Link className="back-link" to={isEditing ? '/profile' : '/privacy'}><ShieldCheck size={15} /> {isEditing ? 'Back to profile' : 'Privacy information'}</Link></header>
    <div className="onboarding-shell"><div className="onboarding-intro"><p className="eyebrow">{isEditing ? 'KEEP YOUR PROFILE CURRENT' : 'YOUR STUDY SPACE STARTS HERE'}</p><h1>{isEditing ? <>Update your <span>study rhythm.</span></> : <>Let’s find your <span>study rhythm.</span></>}</h1><p>A few thoughtful details help StudySync find people who fit the way you learn. You can edit your profile and visibility any time.</p></div>
      <div className="onboarding-progress" aria-label={`Step ${step + 1} of ${steps.length}`}><div className="progress-line"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div><div className="progress-steps">{steps.map((label, index) => <span key={label} className={index === step ? 'current' : index < step ? 'complete' : ''}><i>{index < step ? <Check size={12} /> : index + 1}</i><b>{label}</b></span>)}</div></div>
      <Card className="onboarding-card"><div className="onboarding-card-head"><div><span className="eyebrow">STEP {String(step + 1).padStart(2, '0')} OF 05</span><h2>{steps[step]}</h2></div><span className="step-counter">{step + 1} / 5</span></div>
        {step === 0 && <div className="onboarding-grid"><Field label="Full name" name="full_name" value={draft.full_name} onChange={(e) => update('full_name', e.target.value)} required autoComplete="name" maxLength={100} /><Field label="College or university" name="university" value={draft.university} onChange={(e) => update('university', e.target.value)} placeholder="Your campus" maxLength={160} /><Field label="Degree or program" name="degree" value={draft.degree} onChange={(e) => update('degree', e.target.value)} placeholder="e.g. BSc, MBA" maxLength={120} /><Field label="Department or major" name="major" value={draft.major} onChange={(e) => update('major', e.target.value)} placeholder="e.g. Computer Science" maxLength={120} /><SelectField label="Academic year" name="academic_year" value={draft.academic_year} onChange={(e) => update('academic_year', e.target.value)}><option value="">Choose a year</option>{['First year','Second year','Third year','Fourth year','Graduate','Other'].map((year) => <option key={year}>{year}</option>)}</SelectField><Field label="Semester (optional)" name="semester" value={draft.semester} onChange={(e) => update('semester', e.target.value)} placeholder="e.g. Fall 2026" maxLength={40} /><TextareaField className="span-two" label="A short introduction" name="bio" value={draft.bio} onChange={(e) => update('bio', e.target.value)} placeholder="What are you working toward this semester?" maxLength={500} />
          <div className="avatar-upload span-two"><div className="avatar-preview">{avatarPreview ? <img src={avatarPreview} alt="Selected profile avatar preview" /> : <span>{draft.full_name.split(/\s+/).map((part) => part[0]).slice(0,2).join('').toUpperCase() || 'S'}</span>}</div><div><strong>Profile photo <small>· optional</small></strong><p>JPG, PNG or WebP, up to 3 MB. Private storage.</p><label className="upload-label"><Upload size={15} /> Choose image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setAvatar(file); setAvatarPreview(URL.createObjectURL(file)) } }} /></label></div></div>
        </div>}
        {step === 1 && <div className="choice-step"><p className="step-helper">Choose the subjects you’re studying now. Mark up to three as priorities.</p><div className="search-input"><Search size={17} /><input aria-label="Search subjects" placeholder="Search or add a subject" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="subject-pills">{filteredSubjects.map((name) => { const selected = draft.subjects.some((item) => item.name.trim().toLowerCase() === name.toLowerCase()); return <button type="button" key={name} className={`choice-pill ${selected ? 'selected' : ''}`} onClick={() => toggleSubject(name)}>{selected && <Check size={14} />}{name}</button> })}</div><div className="custom-subject"><Field label="Add a subject not listed" name="custom_subject" value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} placeholder="e.g. Human-computer interaction" maxLength={100} /><Button type="button" variant="secondary" disabled={!customSubject.trim()} onClick={addCustomSubject}><Plus size={16} /> Add subject</Button></div><div className="priority-list"><div className="list-subhead"><strong>Your subjects</strong><span>{draft.subjects.length} selected · mark up to 3 priorities</span></div>{draft.subjects.map((item) => <div className="priority-row" key={item.name}><span>{item.name}</span><label><input type="checkbox" checked={item.priority} disabled={!item.priority && draft.subjects.filter((subject) => subject.priority).length >= 3} onChange={() => update('subjects', draft.subjects.map((subject) => subject.name === item.name ? { ...subject, priority: !subject.priority } : subject))} /> Priority</label><button type="button" className="icon-button" aria-label={`Remove ${item.name}`} onClick={() => toggleSubject(item.name)}><X size={15} /></button></div>)}</div></div>}
        {step === 2 && <div className="choice-step"><p className="step-helper">Good study sessions look different for everyone. Select every format that works for you.</p><div className="option-grid">{LEARNING_PREFERENCES.map(({ value, label }) => <button type="button" className={`option-card ${draft.preferences.includes(value) ? 'selected' : ''}`} key={value} onClick={() => togglePreference(value)}><span className="option-check">{draft.preferences.includes(value) && <Check size={13} />}</span><span>{label}</span></button>)}</div><div className="field collaboration-field"><label htmlFor="collaboration">Preferred collaboration format</label><select id="collaboration" value={draft.collaboration_format} onChange={(e) => update('collaboration_format', e.target.value as Draft['collaboration_format'])}><option value="one_to_one">One-to-one</option><option value="small_group">Small group</option><option value="either">Either</option></select></div></div>}
        {step === 3 && <div className="choice-step"><p className="step-helper">What would make studying together valuable right now? Select your goals, then choose one primary focus.</p><div className="option-grid">{STUDY_GOALS.map(({ value, label }) => { const selected = draft.goals.some((item) => item.code === value); return <button type="button" className={`option-card ${selected ? 'selected' : ''}`} key={value} onClick={() => toggleGoal(value,label)}><span className="option-check">{selected && <Check size={13} />}</span><span>{label}</span></button> })}</div>{draft.goals.length > 0 && <div className="primary-goal"><strong>Primary goal</strong>{draft.goals.map((goal) => <label key={goal.code}><input type="radio" name="primary_goal" checked={goal.primary} onChange={() => setPrimaryGoal(goal.code)} />{goal.label}</label>)}</div>}</div>}
        {step === 4 && <div className="choice-step"><p className="step-helper">Choose the time zone where you usually study. Your recurring windows and session times use this zone; exact ranges remain private.</p><div className="timezone-field"><Field label="IANA time zone" name="timezone_name" value={draft.timezone_name} onChange={(e)=>update('timezone_name',e.target.value)} list="studysync-timezones" hint="Choose your study time zone. Changing it reinterprets the local times below." maxLength={64} required/><datalist id="studysync-timezones">{timeZoneSuggestions.map((zone)=><option key={zone} value={zone}/>)}</datalist></div><div className="availability-list">{draft.availability.map((item,index) => <div className="availability-row" key={`${index}-${item.weekday}`}><SelectField label={`Day ${index + 1}`} name={`weekday-${index}`} value={item.weekday} onChange={(e) => update('availability', draft.availability.map((row,i) => i===index ? { ...row, weekday: Number(e.target.value) } : row))}>{WEEKDAYS.map((day) => <option value={day.value} key={day.value}>{day.label}</option>)}</SelectField><Field label="From" type="time" name={`start-${index}`} value={item.start_time} onChange={(e) => update('availability', draft.availability.map((row,i) => i===index ? { ...row, start_time: e.target.value } : row))} /><Field label="Until" type="time" name={`end-${index}`} value={item.end_time} onChange={(e) => update('availability', draft.availability.map((row,i) => i===index ? { ...row, end_time: e.target.value } : row))} /><button type="button" className="icon-button remove-time" aria-label={`Remove availability ${index + 1}`} onClick={() => update('availability', draft.availability.filter((_,i) => i!==index))}><X size={16} /></button></div>)}{draft.availability.length===0 && <div className="availability-empty"><Clock3 size={19} /><span>No availability added yet.</span></div>}<Button type="button" variant="secondary" onClick={addAvailability}><Plus size={15} /> Add a time window</Button></div><div className="privacy-inline"><ShieldCheck size={16} /><span>Availability is private. StudySync only uses it to calculate overlapping study times.</span></div></div>}
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        <div className="onboarding-actions">{step > 0 ? <Button type="button" variant="ghost" onClick={() => { setError(''); setStep(step-1) }}><ArrowLeft size={16} /> Back</Button> : <span />}{step < steps.length-1 ? <Button type="button" onClick={nextStep}>Continue <ArrowRight size={16} /></Button> : <Button type="button" disabled={busy} onClick={nextStep}>{busy ? 'Saving your profile…' : isEditing ? 'Save study preferences' : 'Finish my profile'} <Check size={16} /></Button>}</div>
      </Card><p className="onboarding-footnote"><ShieldCheck size={14} /> You can change your profile and privacy settings any time.</p></div>
  </main>
}
