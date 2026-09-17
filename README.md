# Balelagenda

Agenda privada para um grupo de amigos: eventos, presença, ideias, fotos e o dia a dia do rolê — sem cadastro aberto.

SPA em React no Vercel; dados e auth no Supabase. Login próprio (username/e-mail + senha via Edge Functions), sem Supabase Auth e sem backend aparte.

## Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind, React Query
- **Backend:** Supabase (Postgres + RLS, Storage, Edge Functions)
- **Deploy:** Vercel (`web/` como root; cron de keep-alive no free tier)

## Como rodar

Precisa de um projeto Supabase (migrations + seed + Edge Functions com `JWT_SECRET`). O passo a passo completo está em [`specs/001-mvp-core/quickstart.md`](specs/001-mvp-core/quickstart.md).

Com o backend pronto:

```powershell
cd web
copy .env.example .env
# VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Admin do seed: `admin` / `Admin@ChangeMe1!` — troque depois.

## Pastas

```text
web/          SPA + api/keepalive (Vercel)
supabase/     migrations, seed, Edge Functions
specs/        spec e runbook do MVP
```

## Notas

- JWT da sessão fica em `localStorage`; RLS usa `auth.uid()` do token custom.
- Não coloque `service_role` nem `JWT_SECRET` no frontend.
- Spec Kit / SDD em `.specify/` e `specs/001-mvp-core/`.
