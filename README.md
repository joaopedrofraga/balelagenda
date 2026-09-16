# Balelagenda

Agenda social privada para um grupo de amigos — **SPA React + Supabase** (sem backend próprio).

## Arquitetura

```text
React (Vite)  --supabase-js (anon key)-->  Supabase Auth + Postgres (RLS) + RPCs
              --functions.invoke------->  Edge Functions (IA / Places; secrets no servidor)
```

- Hospedagem: frontend estático no **Vercel** (Root Directory = `web`)
- Dados e auth: Supabase cloud
- **Nunca** coloque `service_role` no frontend

### Keep-alive do Supabase (free tier)

O plano free da Supabase pode **pausar o projeto após ~7 dias sem atividade**. Isso **não dá para resolver de forma confiável só com React**: o código da SPA só roda quando alguém abre o site. Se ninguém visitar, nenhum ping acontece — exatamente o cenário do pause.

**Não faça** `useEffect` no App pingando o banco a cada X dias no browser (só roda com visitante; não evita pause).

**Solução neste repo:** Vercel Cron + serverless function `web/api/keepalive.ts` (mesmo projeto do frontend — não é um backend hospedado à parte). Agenda diária `0 12 * * *` (Hobby: mínimo ~1×/dia).

No Vercel (projeto com Root Directory = `web`):

1. Environment Variables:
   - `CRON_SECRET` — valor aleatório forte
   - `SUPABASE_URL` — Project URL (sem `VITE_`)
   - `SUPABASE_SERVICE_ROLE_KEY` — service role (só na Function; nunca no frontend)
2. Deploy; o Cron Jobs aparece em Project → Settings → Cron Jobs apontando para `/api/keepalive`
3. Validar: `curl -H "Authorization: Bearer SEU_CRON_SECRET" https://SEU-APP.vercel.app/api/keepalive` → `{ "ok": true, "at": "..." }`

Aviso: a política de pause do free tier pode mudar; keep-alive **ajuda**, mas **não é garantia oficial** da Supabase.

Alternativas que batem na mesma URL: GitHub Actions (schedule) ou [cron-job.org](https://cron-job.org).

## Spec Kit

Fluxo SDD em `.specify/` e feature `specs/001-mvp-core/`.
Constituição v2: Auth via Supabase + RLS (pivot sem servidor de app).

## Setup rápido

1. Crie um projeto no Supabase
2. Rode as migrations em `supabase/migrations/` (SQL Editor, na ordem)
3. Desative confirmação de e-mail (Authentication → Providers → Email) para o fluxo de convite
4. Rode `supabase/seed.sql` (grupo padrão) e o bloco de bootstrap do admin
5. Em `web/`:

```powershell
cd web
copy .env.example .env
# preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Detalhes: `specs/001-mvp-core/quickstart.md`

## MVP 1 incluído

- Login (e-mail ou username) via Supabase Auth
- Signup por convite (admin)
- Admin: listar/desativar/reativar/roles + convites
- Grupo, agenda/eventos, presença, ideias, sorteio

## MVP 2 incluído

- Comentários no evento
- Votação nas ideias
- Histórico de alterações do evento
- Fotos (Supabase Storage, bucket `event-photos`)
- Memórias (timeline de eventos `completed`)

## MVP 3 incluído

- Página **Sugestões** (`/sugestoes`): texto livre → filtros estruturados → lugares reais
- Edge Function `suggest-places` (chaves `AI_API_KEY` / `PLACES_API_KEY` só no Supabase)
- Filtros inteligentes no sorteio (categoria, orçamento, horário, ambiente, anti-repetição)
- Campos `period` / `ambiance` / orçamento nas ideias
- Fallback local se a Edge Function ainda não estiver deployada (não inventa lugares)

## MVP 4 incluído

- Despesas por evento (lançamento, participantes, rateio e saldos)
- Notificações in-app (eventos, comentários, despesas) + marcar como lidas
- Realtime (avisos, presença, comentários, despesas)
- Estatísticas do grupo + badges pessoais (`/estatisticas`)
- PWA instalável (manifest + service worker)
- Foto de perfil (bucket Storage `avatars`, página `/perfil`)

## Próximos

Push nativo, testes automatizados e CI.
