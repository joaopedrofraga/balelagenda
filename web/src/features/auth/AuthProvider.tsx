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
  'id, name, username, email, role, active, avatar_path, calendar_color, created_at, updated_at, last_login_at'

const SESSION_NOT_ACCEPTED_MSG =
  'Login ok, mas a API não autenticou a sessão. Confira se o secret JWT_SECRET das Edge Functions é idêntico ao JWT Secret do projeto (Supabase → Settings → API).'

type AuthContextValue = {
  session: StoredSession | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  refreshProfile: () => Promise<void>
  /** Após login bem-sucedido: valida token no PostgREST e hidrata perfil. */
  acceptSession: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

type ProfileFetchResult =
  | { ok: true; profile: Profile }
  | { ok: false; reason: 'error' | 'empty' | 'inactive'; message?: string }

async function fetchProfile(userId: string): Promise<ProfileFetchResult> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[auth] fetchProfile', error)
    return { ok: false, reason: 'error', message: error.message }
  }
  if (!data) {
    // Select vazio sem erro: típico de JWT rejeitado / auth.uid() nulo (RLS).
    return { ok: false, reason: 'empty' }
  }
  const profile = data as Profile
  if (!profile.active) {
    return { ok: false, reason: 'inactive' }
  }
  return { ok: true, profile }
}

type HydrateResult = 'ok' | 'none' | 'invalid' | 'inactive'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const hydrate = useCallback(async (): Promise<HydrateResult> => {
    const stored = getStoredSession()
    if (!stored) {
      setSession(null)
      setProfile(null)
      return 'none'
    }

    // Só promove sessão depois do perfil — evita race: Navigate com session e profile null.
    const result = await fetchProfile(stored.userId)
    if (!result.ok) {
      await logoutLocal()
      setSession(null)
      setProfile(null)
      if (result.reason === 'inactive') return 'inactive'
      return 'invalid'
    }

    setSession(stored)
    setProfile(result.profile)
    return 'ok'
  }, [])

  const refreshProfile = useCallback(async () => {
    const stored = getStoredSession()
    if (!stored) {
      setProfile(null)
      setSession(null)
      return
    }
    const result = await fetchProfile(stored.userId)
    if (!result.ok) {
      await logoutLocal()
      setSession(null)
      setProfile(null)
      return
    }
    setProfile(result.profile)
    setSession(stored)
  }, [])

  const acceptSession = useCallback(async () => {
    const result = await hydrate()
    if (result === 'ok') return
    if (result === 'none') {
      throw new Error('Sessão não foi gravada após o login. Tente novamente.')
    }
    if (result === 'inactive') {
      throw new Error('Conta inativa. Peça ao administrador para reativar.')
    }
    throw new Error(SESSION_NOT_ACCEPTED_MSG)
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
