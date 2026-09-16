import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../types/database'
import { logoutLocal } from './authService'
import { getStoredSession, type StoredSession } from './sessionStorage'

/** Colunas públicas de profiles — nunca incluir password_hash. */
export const PROFILE_COLUMNS =
  'id, name, username, email, role, active, avatar_path, created_at, updated_at, last_login_at'

type AuthContextValue = {
  session: StoredSession | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  refreshProfile: () => Promise<void>
  /** Após login bem-sucedido: recarrega sessão do storage + perfil. */
  acceptSession: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error(error)
    return null
  }
  return data as Profile | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const hydrate = useCallback(async () => {
    const stored = getStoredSession()
    if (!stored) {
      setSession(null)
      setProfile(null)
      return
    }

    setSession(stored)
    const p = await fetchProfile(stored.userId)
    if (!p || !p.active) {
      await logoutLocal()
      setSession(null)
      setProfile(null)
      return
    }
    setProfile(p)
  }, [])

  const refreshProfile = useCallback(async () => {
    const stored = getStoredSession()
    if (!stored) {
      setProfile(null)
      setSession(null)
      return
    }
    const p = await fetchProfile(stored.userId)
    if (!p || !p.active) {
      await logoutLocal()
      setSession(null)
      setProfile(null)
      return
    }
    setProfile(p)
    setSession(stored)
  }, [])

  const acceptSession = useCallback(async () => {
    await hydrate()
  }, [hydrate])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      await hydrate()
      if (mounted) setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [hydrate])

  const signOut = useCallback(async () => {
    await logoutLocal()
    setSession(null)
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      isAdmin: profile?.role === 'admin' && !!profile.active,
      refreshProfile,
      acceptSession,
      signOut,
    }),
    [session, profile, loading, refreshProfile, acceptSession, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
