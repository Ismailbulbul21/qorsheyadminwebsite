import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export type AdminRole = 'full' | 'viewer'

type AuthState = {
  user: User | null
  isAdmin: boolean | null
  adminRole: AdminRole | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshAdmin: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAdmin = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('admins')
      .select('role')
      .eq('user_id', uid)
      .maybeSingle()
    if (error || !data) {
      setIsAdmin(false)
      setAdminRole(null)
      return
    }
    setIsAdmin(true)
    setAdminRole((data.role as AdminRole) ?? 'full')
  }, [])

  const refreshAdmin = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (u) await checkAdmin(u.id)
    else {
      setIsAdmin(false)
      setAdminRole(null)
    }
  }, [checkAdmin])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        checkAdmin(session.user.id).then(() => setLoading(false))
      } else {
        setIsAdmin(false)
        setAdminRole(null)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        checkAdmin(session.user.id).then(() => setLoading(false))
      } else {
        setIsAdmin(false)
        setAdminRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [checkAdmin])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? new Error(error.message) : null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
    setAdminRole(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAdmin, adminRole, loading, signIn, signOut, refreshAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
