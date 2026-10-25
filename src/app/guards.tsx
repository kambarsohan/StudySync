import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider'
import { Card } from '../components/ui'

export function RequireAuth() {
  const { user, loading, profile, profileLoading } = useAuth()
  const location = useLocation()
  if (loading || (user && profileLoading)) return <main className="center-screen"><Card className="loading-card"><LoaderCircle className="spin" aria-hidden="true" /><span>Restoring your study space…</span></Card></main>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (location.pathname !== '/onboarding' && profile?.onboarding_completed !== true) return <Navigate to="/onboarding" replace />
  if (location.pathname === '/onboarding' && profile?.onboarding_completed === true && new URLSearchParams(location.search).get('edit') !== '1') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export function PublicOnly() {
  const { user, loading, profile, profileLoading } = useAuth()
  if (loading || (user && profileLoading)) return <main className="center-screen"><Card className="loading-card"><LoaderCircle className="spin" aria-hidden="true" /><span>Opening StudySync…</span></Card></main>
  if (user) return <Navigate to={profile?.onboarding_completed ? '/dashboard' : '/onboarding'} replace />
  return <Outlet />
}
