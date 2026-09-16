# Balelagenda

Agenda social privada para um grupo de amigos — **SPA React + Supabase** (Postgres/RLS/Storage/Edge Functions; **sem** Supabase Auth; **sem** backend próprio).

## Arquitetura

```text
React (Vite)  --anon key + JWT custom-->  Postgres (RLS) + Storage + RPCs
              --Edge Functions--------->  login / admin-create-user / senhas / suggest-places
```

- Hospedagem: frontend estático no **Vercel** (Root Directory = `web`)
- Auth: tabela `profiles.password_hash` + Edge Functions; JWT assinado com o **JWT Secret** do projeto (compatível com `auth.uid()`)
- Sessão: JWT em `localStorage` (`balelagenda_access_token`); TTL ~30 dias
- **Nunca** coloque `service_role` ou `JWT_SECRET` no frontend
- **Não** use Dashboard → Authentication → Users, Confirm email, convites ou `signInWithPassword`

### Keep-alive do Supabase (free tier)

O plano free da Supabase pode **pausar o projeto após ~7 dias sem atividade**. Isso **não dá para resolver de forma confiável só com React**: o código da SPA só roda quando alguém abre o site.

**Solução neste repo:** Vercel Cron + serverless function `web/api/keepalive.ts`. Agenda diária `0 12 * * *` (UTC).

No Vercel (Root Directory = `web`):

1. Env: `CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (só na Function)
2. Validar: `curl -H "Authorization: Bearer SEU_CRON_SECRET" https://SEU-APP.vercel.app/api/keepalive`

## Spec Kit

Fluxo SDD em `.specify/` e feature `specs/001-mvp-core/`.
Constituição v3: auth custom (Edge Functions) + RLS — sem Supabase Auth.

## Setup rápido (local)

1. Crie um projeto no Supabase (anote URL, anon, service_role, **JWT Secret**)
2. Rode as migrations `001→007` + `supabase/seed.sql` (grupo + admin `admin` / `Admin@ChangeMe1!`)
3. `supabase secrets set JWT_SECRET="…"` (= JWT Secret do projeto)
4. Deploy: `login`, `admin-create-user`, `admin-set-password`, `change-password`
5. Em `web/`:

```powershell
cd web
copy .env.example .env
# preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Produção (Supabase + Vercel)

**Runbook completo (do zero):** [`specs/001-mvp-core/quickstart.md`](specs/001-mvp-core/quickstart.md) → seção **“Produção — runbook completo”**.

Cobre: arquitetura, credenciais (incl. JWT Secret), migrations 001→007 + seed, Storage, Realtime, secrets/deploy das Edge Functions, verificação do admin seed, GitHub, Vercel, keep-alive, smoke test, troubleshooting e checklist.

| Passo | Detalhe |
|---|---|
| Migrations | SQL Editor, ordem `001` … `007` + `seed.sql` |
| Auth | **Não** use Auth Users / Confirm email / convites |
| Admin seed | username `admin`, senha `Admin@ChangeMe1!` (troque depois) |
| Edge Functions | `login`, `admin-create-user`, `admin-set-password`, `change-password` + `JWT_SECRET` |
| Buckets | `event-photos` e `avatars` vêm das migrations 004 e 007 |
| Vercel | Root Directory = `web`; env `VITE_*` + keepalive secrets |
| Keep-alive | Cron → `/api/keepalive` |

## MVP 1 incluído

- Login (username ou e-mail) + senha via Edge Function `login`
- Sessão persistente (JWT em `localStorage`) + logout
- Admin: criar usuário com senha, desativar/reativar, roles, redefinir senha
- Grupo, agenda/eventos, presença, ideias, sorteio

## MVP 2–4

Comentários, votos, fotos, memórias, sugestões IA/Places, despesas, notificações, estatísticas, PWA, avatar de perfil — ver quickstart e migrations `004`–`007`.
