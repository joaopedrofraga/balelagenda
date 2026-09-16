<!--
Sync Impact Report
- Version change: 1.0.0 → 2.0.0 (MAJOR)
- Modified principles:
  - II. Custom Auth, Never Supabase Auth → II. Supabase Auth via SPA Client
  - III. Server-Side Authorization → III. RLS-First Authorization
- Added sections: Deploy Model
- Removed sections: none
- Deferred TODOs: none
- Rationale: Usuário não possui servidor para backend/BFF/Edge Functions de app;
  toda integração deve ocorrer no React com anon key + RLS.
-->

# Balelagenda Constitution

## Core Principles

### I. Spec-Anchored Development
All features MUST be described in Spec Kit artifacts (`spec.md`, `plan.md`, `tasks.md`)
before implementation. Code follows the spec; the spec is updated before intentional
behavior changes. Rationale: small friend-group product with evolving ideas needs a
single source of truth to avoid drift.

### II. Supabase Auth via SPA Client
Authentication MUST use **Supabase Auth** through `@supabase/supabase-js` in the React
SPA. There MUST NOT be a custom application backend, BFF, Node/ASP.NET API, or app-hosted
Edge Functions for auth or business logic. Passwords are managed by Supabase Auth (never
stored or hashed in application tables). Rationale: no dedicated server available; client
+ Supabase cloud only. (Amends original “no Supabase Auth” product note — that model
required a backend and is incompatible with SPA-only hosting.)

### III. RLS-First Authorization
All authorization MUST be enforced by **Postgres Row Level Security (RLS)** and, when
needed, `SECURITY DEFINER` SQL functions callable via PostgREST/RPC. The browser MUST
only receive `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The `service_role` key
MUST NEVER appear in frontend code, env shipped to the client, or commits. UI hiding of
admin controls is insufficient — RLS MUST reject unauthorized writes/reads. Rationale:
security without a BFF.

### IV. Soft Delete & History Preservation
Users and domain records MUST prefer soft deactivation (`profiles.active = false`,
status flags) over hard deletes. Inactive profiles MUST be blocked from using the app
(client gate + RLS). The last active admin MUST NOT be deactivatable (DB constraint or
trigger). Rationale: preserve events, comments, votes, and history for the group.

### V. Simplicity & Low Cost
The system MUST stay simple, mobile-first, and cheap: static frontend host + Supabase
cloud. Prefer feature folders in React over premature abstraction. Optional features
(IA, Places, despesas, PWA) MUST NOT block the core agenda loop.

## Stack & Architecture

- **Frontend only**: React, TypeScript, Vite, React Router, Tailwind CSS, React Hook Form,
  Zod, TanStack Query, `@supabase/supabase-js`
- **Backend-as-a-service**: Supabase (Auth, PostgreSQL + RLS, Storage later, Realtime optional)
- **No** custom API server, **no** service_role in the client
- **Schema/RLS**: versioned SQL under `supabase/migrations/`
- **Deploy**: static SPA (Vercel/Netlify/GitHub Pages/etc.) + Supabase project

## Deploy Model

```text
Browser (React SPA)
  └── supabase-js (anon key)
        ├── Auth
        ├── PostgREST (tables/RPC) + RLS
        ├── Storage (later)
        └── Realtime (optional)
```

## Security

- Env public: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only
- Never commit `service_role` or personal access tokens
- Provisioning: first admin via Supabase Dashboard / SQL seed; additional users via
  invite flow enforceable by RLS (no open public registration without invite)
- Inactive users: `profiles.active = false` blocks data access via RLS

## Product Scope

**In scope (MVP 1)**: Supabase Auth login, profile/admin management (via RLS + invites),
groups, shared agenda, events CRUD/cancel, attendance, outing ideas, random outing.

**Deferred**: comments, memories, photos, IA/places, expenses, notifications, PWA (MVP 2–4).

## Governance

This constitution supersedes informal implementation choices and prior v1.x auth/backend
rules. Amendments require version bump (MAJOR for incompatible rule changes), date, and
rationale. Specs and code MUST comply.

**Version**: 2.0.0 | **Ratified**: 2026-09-16 | **Last Amended**: 2026-09-16
