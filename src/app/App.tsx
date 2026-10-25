import { lazy, Suspense } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/Layout'
import { RequireAuth, PublicOnly } from './guards'

const LandingPage = lazy(() => import('../pages/LandingPage').then((module) => ({ default: module.LandingPage })))
const LegalPage = lazy(() => import('../pages/LegalPage').then((module) => ({ default: module.LegalPage })))
const AuthPage = lazy(() => import('../features/auth/AuthPage').then((module) => ({ default: module.AuthPage })))
const StudentProfilePage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.StudentProfilePage })))
const OnboardingPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.OnboardingPage })))
const DashboardPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.DashboardPage })))
const DiscoverPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.DiscoverPage })))
const ConnectionsPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.ConnectionsPage })))
const GroupsPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.GroupsPage })))
const CreateGroupPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.CreateGroupPage })))
const GroupDetailPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.GroupDetailPage })))
const PlannerPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.PlannerPage })))
const SessionDetailPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.SessionDetailPage })))
const NotificationsPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.NotificationsPage })))
const ProfilePage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.ProfilePage })))
const SettingsPage = lazy(() => import('../pages/WorkspacePages').then((module) => ({ default: module.SettingsPage })))

function NotFound() {
  return <main className="center-screen"><div className="not-found"><p className="eyebrow">404 · PAGE NOT FOUND</p><h1>This page isn’t in your study plan.</h1><p>The link may have moved, or the page isn’t available.</p><Link className="button button-primary" to="/">Back to StudySync</Link></div></main>
}

function PageLoading() {
  return <main className="center-screen"><div className="loading-card" role="status">Opening StudySync…</div></main>
}

export function App() {
  return <Suspense fallback={<PageLoading />}><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/privacy" element={<LegalPage kind="privacy" />} />
    <Route path="/terms" element={<LegalPage kind="terms" />} />
    <Route path="/students/:id" element={<StudentProfilePage />} />
    <Route element={<PublicOnly />}>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
    </Route>
    <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
    <Route path="/reset-password" element={<AuthPage mode="reset" />} />
    <Route element={<RequireAuth />}>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/groups/create" element={<CreateGroupPage />} />
        <Route path="/groups/:id" element={<GroupDetailPage />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/sessions/:id" element={<SessionDetailPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes></Suspense>
}
