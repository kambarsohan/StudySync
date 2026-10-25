export type ProfileVisibility = 'discoverable' | 'connections' | 'private'
export type CollaborationFormat = 'one_to_one' | 'small_group' | 'either'

export interface Profile {
  id: string
  full_name: string
  university: string | null
  degree: string | null
  major: string | null
  academic_year: string | null
  semester: string | null
  bio: string | null
  avatar_path?: string | null
  avatar_url?: string | null
  timezone_name: string | null
  collaboration_format?: CollaborationFormat
  visibility: ProfileVisibility
  onboarding_completed: boolean
  show_university: boolean
  show_degree: boolean
  show_major: boolean
  show_academic_year: boolean
  show_semester: boolean
  show_bio: boolean
  show_avatar: boolean
  show_timezone: boolean
  show_subjects: boolean
  show_goals: boolean
  created_at?: string
}

export interface MatchFactor {
  score: number | null
  weight: number
  shared: string[]
  detail: string
}

export interface StudentMatch extends Profile {
  compatibility_score: number
  factors: {
    subjects: MatchFactor
    availability: MatchFactor
    goals: MatchFactor
    preferences: MatchFactor
  }
  subjects: string[]
  goals: string[]
}

export interface NotificationItem {
  id: string
  kind: string
  title: string
  body: string
  href: string | null
  created_at: string
  read_at: string | null
}

export const SUBJECT_SUGGESTIONS = [
  'Python Programming', 'Data Structures', 'Mathematics', 'Database Management Systems',
  'Artificial Intelligence', 'Machine Learning', 'Web Development', 'Statistics',
  'Operating Systems', 'Algorithms', 'Computer Networks', 'Linear Algebra',
  'Business Analytics', 'Economics', 'Physics', 'Chemistry',
]

export const LEARNING_PREFERENCES = [
  { value: 'practice_problems', label: 'Practice problems' },
  { value: 'conceptual_explanations', label: 'Conceptual explanations' },
  { value: 'flashcards_revision', label: 'Flashcards & revision' },
  { value: 'project_based', label: 'Project-based learning' },
  { value: 'discussion_teaching', label: 'Discussion & teaching' },
  { value: 'quiet_coworking', label: 'Quiet co-working' },
]

export const STUDY_GOALS = [
  { value: 'prepare_exams', label: 'Prepare for exams' },
  { value: 'complete_assignments', label: 'Complete assignments' },
  { value: 'learn_skill', label: 'Learn a new skill' },
  { value: 'build_projects', label: 'Build projects' },
  { value: 'prepare_interviews', label: 'Prepare for interviews' },
  { value: 'consistent_habit', label: 'Build a consistent study habit' },
]

export const WEEKDAYS = [
  { value: 1, label: 'Monday' }, { value: 2, label: 'Tuesday' }, { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' }, { value: 5, label: 'Friday' }, { value: 6, label: 'Saturday' }, { value: 0, label: 'Sunday' },
]
