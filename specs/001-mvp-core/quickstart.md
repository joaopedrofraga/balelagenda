# Quickstart: Balelagenda (SPA + Supabase)

## 1. Criar projeto Supabase

1. Crie um projeto em https://supabase.com
2. Copie Project URL e `anon` `public` key (Settings → API)
3. **Não** use a `service_role` no frontend

## 2. Aplicar migrations

No SQL Editor do Supabase (ou CLI `supabase db push`), execute na ordem:

- `supabase/migrations/20260916000001_init_schema.sql`
- `supabase/migrations/20260916000002_rls_policies.sql`
- `supabase/migrations/20260916000003_rpcs.sql`
- `supabase/migrations/20260916000004_mvp2_comments_memories.sql`
- `supabase/migrations/20260916000005_mvp3_ai_places_filters.sql`
- `supabase/migrations/20260916000006_mvp4_expenses_notifications_stats.sql`
- `supabase/migrations/20260916000007_profile_avatars.sql`
- `supabase/seed.sql` (grupo padrão)

## 3. Bootstrap do primeiro admin

1. Em Authentication → Providers → Email: desative “Confirm email” (fluxo de convite privado).
2. Authentication → Users → Add user (e-mail + senha)
3. No SQL Editor, rode o bloco documentado em `supabase/seed.sql` substituindo o UUID do usuário criado (perfil admin + membership no grupo)

## 4. Frontend

```powershell
cd web
copy .env.example .env
# preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Abra http://localhost:5173

## 5. Fluxo de teste

1. Login como admin
2. Administração → criar convite
3. Logout → Signup com token do convite
4. Criar evento, marcar presença, cadastrar ideia, sortear rolê
5. No evento: comentar, enviar foto, editar (ver histórico), “Virar memória”
6. Em Ideias: votar (▲), filtrar por categoria/orçamento
7. Abrir Memórias e ver timeline + fotos
8. Em Sugestões: pedir sugestão em texto livre; conferir filtros; (com Edge Function) ver lugares
9. Em Rolê aleatório: sortear com filtros e anti-repetição
10. No evento: adicionar despesa, escolher quem divide, conferir saldos
11. Em Avisos: ver notificações (criar/editar evento, comentário, despesa) e marcar lidas
12. Em Estatísticas: ver totais do grupo e badges pessoais
13. Em Perfil: adicionar/trocar/remover foto (aparece no header, grupo, presença, comentários)
14. (Opcional) Instalar PWA pelo navegador após `npm run build` + `npm run preview` em HTTPS/localhost

## 6. Edge Function (MVP 3 — opcional, mas necessária para lugares reais)

```bash
supabase functions deploy suggest-places
supabase secrets set AI_API_KEY=... PLACES_API_KEY=... PLACES_PROVIDER=geoapify DEFAULT_CITY="São Paulo, Brazil"
```

Detalhes: `supabase/functions/suggest-places/README.md`

## 7. Deploy Vercel + keep-alive do Supabase

**Root Directory** do projeto no Vercel: `web` (aí `vercel.json` e `api/keepalive.ts` entram no deploy).

Por que não no React? Código no browser só executa com visitante. Sem visitas por ~7 dias, o free tier do Supabase pode pausar — keep-alive precisa de **agendador externo** (Vercel Cron neste repo).

Env vars **só na Vercel** (Production), sem prefixo `VITE_`:

| Variável | Onde |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Build do frontend |
| `SUPABASE_URL` | Function `/api/keepalive` |
| `SUPABASE_SERVICE_ROLE_KEY` | Function (secret; nunca no client) |
| `CRON_SECRET` | Cron + validação `Authorization: Bearer …` |

Cron: `0 12 * * *` → `/api/keepalive` (1×/dia; limite típico do Hobby).

Teste manual:

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" https://SEU-APP.vercel.app/api/keepalive
```

Esperado: `{ "ok": true, "at": "..." }`.

Alternativas: GitHub Actions scheduled workflow ou cron-job.org na mesma URL. Keep-alive não é garantia oficial da Supabase.
