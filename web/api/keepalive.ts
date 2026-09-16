import { createClient } from '@supabase/supabase-js'

type VercelRequest = {
  method?: string
  headers: Record<string, string | string[] | undefined>
}

type VercelResponse = {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
}

/**
 * Keep-alive leve do Supabase (Vercel Cron / ping manual).
 * Não roda no React: SPA só executa com visitante; pause precisa de agendador externo.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 * (Vercel injeta automaticamente quando CRON_SECRET está nas env vars do projeto.)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method ?? 'GET'
  if (method !== 'GET' && method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' })
    return
  }

  const secret = process.env.CRON_SECRET
  const authHeader = headerValue(req.headers.authorization)
  if (!secret || authHeader !== `Bearer ${secret}`) {
    res.status(401).json({ ok: false, error: 'Unauthorized' })
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({
      ok: false,
      error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    })
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Ping mínimo: 1 linha de tabela existente (service role, só no server).
  const { error } = await supabase.from('groups').select('id').limit(1)

  if (error) {
    res.status(502).json({ ok: false, error: error.message })
    return
  }

  res.status(200).json({ ok: true, at: new Date().toISOString() })
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}
