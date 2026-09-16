import { supabase } from '../../lib/supabase'

type InvitePreview = {
  id: string
  email: string
  username: string
  name: string
  role: string
  expires_at: string
}

export async function loginWithIdentifier(identifier: string, password: string) {
  const trimmed = identifier.trim()
  let email = trimmed

  if (!trimmed.includes('@')) {
    const { data, error } = await supabase.rpc('resolve_login_email', {
      p_username: trimmed,
    })
    if (error) throw error
    if (!data || typeof data !== 'string') {
      throw new Error('Usuário ou senha inválidos.')
    }
    email = data
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error('Usuário ou senha inválidos.')
  }

  await supabase.rpc('touch_last_login')
}

export async function signupWithInvite(params: {
  token: string
  email: string
  password: string
}) {
  const { data: inviteRows, error: inviteError } = await supabase.rpc(
    'get_invite_by_token',
    { p_token: params.token },
  )
  if (inviteError) throw inviteError
  const rows = inviteRows as InvitePreview[] | InvitePreview | null
  const invite = Array.isArray(rows) ? rows[0] : rows
  if (!invite) throw new Error('Convite inválido ou expirado.')
  if (invite.email.toLowerCase() !== params.email.trim().toLowerCase()) {
    throw new Error('Use o e-mail do convite.')
  }

  const { error: signUpError } = await supabase.auth.signUp({
    email: params.email.trim(),
    password: params.password,
  })
  if (signUpError) throw signUpError

  const { error: completeError } = await supabase.rpc('complete_invite_signup', {
    p_token: params.token,
  })
  if (completeError) throw completeError
}
