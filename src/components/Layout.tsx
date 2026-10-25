import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Bell, BookOpenCheck, CalendarDays, Compass, DoorOpen, LayoutDashboard, Menu, Settings, Users, UserRound, UserRoundPlus, X } from 'lucide-react'
import { Brand } from './Brand'
import { Avatar } from './ui'
import { useAuth } from '../features/auth/AuthProvider'
import { requireSupabase } from '../lib/supabase'

const links = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/discover', label: 'Find study buddies', icon: Compass },
  { to: '/connections', label: 'Connections', icon: UserRoundPlus },
  { to: '/groups', label: 'Study groups', icon: Users },
  { to: '/planner', label: 'Study planner', icon: CalendarDays },
  { to: '/notifications', label: 'Notifications', icon: Bell },
]

export function AppLayout() {
  const { user, profile } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  async function logout() {
    try {
      const { error } = await requireSupabase().auth.signOut()
      if (error) throw error
      toast.success('You are signed out.')
      navigate('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sign out. Try again.')
    }
  }

  return <div className="workspace-shell">
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-top"><Brand to="/dashboard" />{menuOpen && <button className="icon-button sidebar-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={19} /></button>}</div>
      <div className="side-caption">YOUR STUDY SPACE</div>
      <nav className="side-nav">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMenuOpen(false)} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom">
        <NavLink to="/profile" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}><UserRound size={18} /><span>My profile</span></NavLink>
        <NavLink to="/settings" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}><Settings size={18} /><span>Settings</span></NavLink>
        <div className="user-chip"><Avatar name={profile?.full_name || user?.email} src={profile?.avatar_url} size="sm" /><div className="user-chip-text"><strong>{profile?.full_name || 'Student'}</strong><span>{profile?.university || user?.email}</span></div><button className="icon-button logout-button" aria-label="Sign out" title="Sign out" onClick={() => void logout()}><DoorOpen size={17} /></button></div>
      </div>
    </aside>
    <div className="workspace-main">
      <header className="mobile-topbar"><button className="icon-button" aria-label="Open navigation menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu size={21} /></button><Brand to="/dashboard" compact /><NavLink className="mobile-bell" to="/notifications" aria-label="Notifications"><Bell size={19} /></NavLink></header>
      {menuOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <main className="workspace-content"><Outlet /></main>
      <nav className="mobile-bottom-nav" aria-label="Quick navigation">
        <NavLink to="/dashboard" aria-label="Overview"><LayoutDashboard size={20} /></NavLink><NavLink to="/discover" aria-label="Discover"><Compass size={20} /></NavLink><NavLink to="/groups" aria-label="Groups"><Users size={20} /></NavLink><NavLink to="/planner" aria-label="Planner"><CalendarDays size={20} /></NavLink><NavLink to="/profile" aria-label="Profile"><UserRound size={20} /></NavLink>
      </nav>
    </div>
    <span className="sr-only"><BookOpenCheck aria-hidden="true" /></span>
  </div>
}
