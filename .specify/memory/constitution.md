<!--
Sync Impact Report
- Version change: 2.0.0 → 3.0.0 (MAJOR)
- Modified principles:
  - II. Supabase Auth via SPA Client → II. Custom Auth via Supabase Edge Functions
- Added: password_hash on profiles; JWT custom; no auth.users
- Rationale: Usuário exige login/senha próprio + painel admin (criar usuário/senha)
  sem Supabase Auth; Edge Functions no Supabase (não é servidor hospedado pelo usuário).
-->

# Balelagenda Constitution

## Core Principles

### I. Spec-Anchored Development
All features MUST be described in Spec Kit artifacts (`spec.md`, `plan.md`, `tasks.md`)
before implementation. Code follows the spec; the spec is updated before intentional
behavior changes. Rationale: small friend-group product with evolving ideas needs a
single source of truth to avoid drift.

### II. Custom Auth via Supabase Edge Functions
Authentication MUST NOT use **Supabase Auth** (`auth.users`, `signInWithPassword`,
`signUp`, Dashboard Auth Users). Passwords MUST live as **`profiles.password_hash`**
(bcrypt/argon2; never plaintext; never exposed to the SPA). Login and password changes
MUST run in **Supabase Edge Functions**, issuing JWTs signed with the project
**JWT Secret** so PostgREST/RLS continue to use `auth.uid()`. There MUST NOT be a
user-hosted application backend (no BFF/Node/ASP.NET of their own). Rationale: admin
creates users with passwords; persistent session in the SPA; zero self-hosted server.

### III. RLS-First Authorization
All authorization MUST be enforced by **Postgres Row Level Security (RLS)** and, when
needed, `SECURITY DEFINER` SQL functions callable via PostgREST/RPC. The browser MUST
only receive `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The `service_role` key
and `JWT_SECRET` MUST NEVER appear in frontend code, env shipped to the client, or
commits. UI hiding of admin controls is insufficient — RLS MUST reject unauthorized
writes/reads. Rationale: security without a self-hosted BFF.

### IV. Soft Delete & History Preservation
Users and domain records MUST prefer soft deactivation (`profiles.active = false`,
status flags) over hard deletes. Inactive profiles MUST be blocked from using the app
(client gate + RLS + login Function). The last active admin MUST NOT be deactivatable
(DB constraint or trigger). Rationale: preserve events, comments, votes, and history.

### V. Simplicity & Low Cost
The system MUST stay simple, mobile-first, and cheap: static frontend host + Supabase
cloud (Postgres, Storage, Edge Functions). Prefer feature folders in React over
premature abstraction. Optional features (IA, Places, despesas, PWA) MUST NOT block
the core agenda loop.

## Stack & Architecture

- **Frontend only**: React, TypeScript, Vite, React Router, Tailwind CSS, React Hook Form,
  Zod, TanStack Query, `@supabase/supabase-js`
- **Backend-as-a-service**: Supabase (PostgreSQL + RLS, Edge Functions for auth/IA,
  Storage, Realtime optional) — **not** Supabase Auth
- **No** custom API server hosted by the user, **no** service_role / JWT_SECRET in the client
- **Schema/RLS**: versioned SQL under `supabase/migrations/`
- **Deploy**: static SPA (Vercel) + Supabase project

## Deploy Model

```text
Browser (React SPA)
  └── supabase-js (anon key + Bearer JWT em localStorage)
        ├── Edge Functions: login / admin-create-user / admin-set-password / change-password
        ├── PostgREST (tables/RPC) + RLS (auth.uid() via JWT sub)
        ├── Storage
        └── Realtime (optional)
```

## Security

- Env public: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only
- Never commit `service_role`, `JWT_SECRET`, or personal access tokens
- Provisioning: first admin via `supabase/seed.sql` (username + `password_hash`);
  additional users via admin panel → Edge Function (no open public registration)
- Column `password_hash` revoked from `anon`/`authenticated`
- Inactive users: `profiles.active = false` blocks login and data access via RLS

## Product Scope

**In scope (MVP 1)**: custom login (username/email + password), admin user management
(create with password, deactivate/reactivate, roles, reset password), groups, shared
agenda, events CRUD/cancel, attendance, outing ideas, random outing.

**Deferred extras**: already delivered in MVP 2–4 in repo (comments, memories, photos,
IA/places, expenses, notifications, PWA, avatars).

## Governance

This constitution supersedes informal implementation choices and prior v2.x Supabase Auth
rules. Amendments require version bump (MAJOR for incompatible rule changes), date, and
rationale. Specs and code MUST comply.

**Version**: 3.0.0 | **Ratified**: 2026-09-16
