# Implementation Plan: Balelagenda MVP Core

**Branch**: `001-mvp-core` | **Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md)

## Summary

SPA React (Vite) + `@supabase/supabase-js` apenas. Auth, dados e autorização via Supabase Auth + PostgreSQL RLS. Migrations SQL versionadas em `supabase/migrations`. Deploy: frontend estático + Supabase cloud. **Sem** backend/API próprio.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Vite 6+

**Primary Dependencies**: React Router, Tailwind CSS, TanStack Query, React Hook Form, Zod, `@supabase/supabase-js`

**Storage**: Supabase PostgreSQL (Auth + RLS); Storage depois

**Testing**: Manual quickstart; SQL policies testáveis no SQL editor

**Target Platform**: Browser (mobile-first); static hosting

**Project Type**: SPA only (no custom server)

**Performance Goals**: Grupo pequeno; queries simples indexadas por group_id

**Constraints**: Sem service_role no client; sem BFF; sem Edge Functions de app

**Scale/Scope**: 1 grupo padrão, MVP 1

## Constitution Check

| Gate | Status |
|------|--------|
| Spec-Anchored | PASS |
| Supabase Auth via SPA | PASS |
| RLS-First | PASS — policies + RPCs |
| Soft delete | PASS — profiles.active / event status |
| Simplicity / no custom server | PASS |

## Project Structure

### Documentation

```text
specs/001-mvp-core/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/supabase.md
├── tasks.md, spec.md
└── checklists/requirements.md
```

### Source Code

```text
web/                      # Vite React SPA (raiz do app)
  src/
    app/                  # router, providers
    components/layout|ui
    features/             # auth, admin, groups, events, attendance, outingIdeas, randomOuting
    lib/supabase.ts
    types/
supabase/
  migrations/             # schema + RLS + RPCs
  seed.sql                # grupo padrão + notas de bootstrap admin
docs/
  balelagenda_especificacao_completa.md
```

**Structure Decision**: single Vite app at `web/` + `supabase/migrations` (no `apps/api`).

## Complexity Tracking

| Violation vs spec original | Why Needed | Alternative rejected |
|----------------------------|------------|----------------------|
| Usar Supabase Auth | Sem servidor para auth custom | Auth custom exigiria BFF/Edge |
| Convites em vez de admin criar senha direto | service_role proibido no browser | Admin API Auth exige service_role |
