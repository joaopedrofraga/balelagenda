import { createClient } from '@supabase/supabase-js'
import { getAccessToken } from '../features/auth/sessionStorage'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  console.warn(
    'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em web/.env (veja .env.example).',
  )
}

/**
 * Cliente browser — apenas anon key + JWT custom (accessToken).
 * Autorização = RLS no Postgres. Sem Supabase Auth (signIn/signUp).
 */
export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  accessToken: async () => getAccessToken() ?? '',
})

/** Base URL das Edge Functions (mesmo projeto). */
export function functionsUrl(name: string) {
  const base = (url ?? '').replace(/\/$/, '')
  return `${base}/functions/v1/${name}`
}

export async function invokeFunction<T>(
  name: string,
  body?: unknown,
  opts?: { auth?: boolean },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: anonKey ?? '',
  }
  if (opts?.auth !== false) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  } else if (anonKey) {
    headers.Authorization = `Bearer ${anonKey}`
  }

  const res = await fetch(functionsUrl(name), {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data?.error || `Falha em ${name} (${res.status})`)
  }
  return data
}
