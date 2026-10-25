import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Profile } from '../../lib/types'
import { requireSupabase, supabase, supabaseConfigured } from '../../lib/supabase'

type AuthValue = {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  profileLoading: boolean
  configured: boolean
  refreshProfile: (userId?: string) => Promise<Profile | null>
  setProfile: (profile: Profile | null) => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return null
    setProfileLoading(true)
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (error) throw error
      const result = (data as Profile | null) ?? null
      setProfile(result)
      return result
    } catch {
      setProfile(null)
      return null
    } finally {
      setProfileLoading(false)
    }
  }, [])

  const refreshProfile = useCallback(async (userId?: string) => {
    const currentId = userId || session?.user.id
    if (!currentId) {
      setProfile(null)
      return null
    }
    return loadProfile(currentId)
  }, [loadProfile, session?.user.id])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let alive = true
    const client = requireSupabase()
    client.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session)
      if (data.session?.user) void loadProfile(data.session.user.id)
      setLoading(false)
    })
    const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!alive) return
      setSession(nextSession)
      if (nextSession?.user) window.setTimeout(() => void loadProfile(nextSession.user.id), 0)
      else setProfile(null)
      setLoading(false)
    })
    return () => {
      alive = false
      authListener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const value = useMemo(() => ({
    user: session?.user ?? null, session, profile, loading, profileLoading,
    configured: supabaseConfigured, refreshProfile, setProfile,
  }), [session, profile, loading, profileLoading, refreshProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
