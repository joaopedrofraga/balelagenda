/** Persistência de sessão custom (JWT das Edge Functions) — nunca JWT_SECRET no browser. */

const TOKEN_KEY = 'balelagenda_access_token'
const EXPIRES_KEY = 'balelagenda_token_expires'
const USER_KEY = 'balelagenda_user_id'

export type StoredSession = {
  accessToken: string
  expiresAt: number
  userId: string
}

export function getStoredSession(): StoredSession | null {
  try {
    const accessToken = localStorage.getItem(TOKEN_KEY)
    const expiresRaw = localStorage.getItem(EXPIRES_KEY)
    const userId = localStorage.getItem(USER_KEY)
    if (!accessToken || !expiresRaw || !userId) return null
    const expiresAt = Number(expiresRaw)
    if (!Number.isFinite(expiresAt) || expiresAt * 1000 <= Date.now()) {
      clearStoredSession()
      return null
    }
    return { accessToken, expiresAt, userId }
  } catch {
    return null
  }
}

export function getAccessToken(): string | null {
  return getStoredSession()?.accessToken ?? null
}

export function setStoredSession(params: {
  accessToken: string
  expiresAt: number
  userId: string
}) {
  localStorage.setItem(TOKEN_KEY, params.accessToken)
  localStorage.setItem(EXPIRES_KEY, String(params.expiresAt))
  localStorage.setItem(USER_KEY, params.userId)
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EXPIRES_KEY)
  localStorage.removeItem(USER_KEY)
}
