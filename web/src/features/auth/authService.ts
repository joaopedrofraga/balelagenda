import { invokeFunction } from '../../lib/supabase'
import type { Profile, UserRole } from '../../types/database'
import { clearStoredSession, setStoredSession } from './sessionStorage'

export type LoginResponse = {
  access_token: string
  token_type: string
  expires_in: number
  expires_at: number
  user: Profile
}

export async function loginWithIdentifier(identifier: string, password: string) {
  const data = await invokeFunction<LoginResponse>(
    'login',
    { identifier: identifier.trim(), password },
    { auth: false },
  )

  if (!data?.access_token || !data?.expires_at || !data?.user?.id) {
    throw new Error('Resposta de login incompleta. Verifique o deploy da Function login.')
  }

  setStoredSession({
    accessToken: data.access_token,
    expiresAt: data.expires_at,
    userId: data.user.id,
  })

  return data.user
}

export async function logoutLocal() {
  clearStoredSession()
}

export async function adminCreateUser(payload: {
  name: string
  username: string
  email?: string | null
  password: string
  role: UserRole
}) {
  return invokeFunction<{ user: Profile }>('admin-create-user', {
    ...payload,
    add_to_default_group: true,
  })
}

export async function adminSetPassword(userId: string, password: string) {
  return invokeFunction<{ ok: boolean }>('admin-set-password', {
    user_id: userId,
    password,
  })
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return invokeFunction<{ ok: boolean }>('change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
}
