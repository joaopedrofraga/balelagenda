# Tasks: Balelagenda MVP Core (SPA + Supabase)

**Input**: Design documents from `/specs/001-mvp-core/`

## Phase 1: Setup

- [x] T001 Create Vite React-TS app in `web/`
- [x] T002 [P] Add Tailwind, React Router, TanStack Query, RHF, Zod, supabase-js
- [x] T003 [P] Add `web/.env.example` and `web/src/lib/supabase.ts`
- [x] T004 [P] Scaffold `supabase/migrations/` and feature folders under `web/src`

## Phase 2: Foundational (SQL + app shell)

- [x] T005 Create schema migration `supabase/migrations/20260916000001_init_schema.sql`
- [x] T006 [P] Create RLS migration `supabase/migrations/20260916000002_rls_policies.sql`
- [x] T007 [P] Create RPCs migration `supabase/migrations/20260916000003_rpcs.sql`
- [x] T008 [P] Create `supabase/seed.sql` (default group + admin bootstrap notes)
- [x] T009 App shell: router, providers, layout, auth gate in `web/src/app/`

## Phase 3: US1 Auth (P1)

- [x] T010 [US1] Login page (email or username)
- [x] T011 [US1] Signup-with-invite page
- [x] T012 [US1] Session provider + protect routes + force logout if inactive

## Phase 4: US2 Admin (P1)

- [x] T013 [US2] Admin users list/edit/deactivate/reactivate
- [x] T014 [US2] Create invite UI + copy token/link

## Phase 5: US3 Group (P2)

- [x] T015 [US3] Group page listing members

## Phase 6: US4 Events (P1)

- [x] T016 [US4] Events list + create/edit/cancel
- [x] T017 [US4] Event detail page

## Phase 7: US5 Attendance (P2)

- [x] T018 [US5] Attendance controls + counts

## Phase 8: US6 Ideas + draw (P2)

- [x] T019 [US6] Outing ideas CRUD
- [x] T020 [US6] Random outing page + create event CTA

## Phase 9: Polish

- [x] T021 Dashboard home
- [x] T022 [P] README + quickstart
- [x] T023 Empty states + mobile nav

## Phase 10: MVP 2 — Comentários, votos, histórico, memórias, fotos

- [x] T024 Schema + RLS + Storage `event_comments`, `outing_votes`, `event_history`, `event_photos`
- [x] T025 [P] Comentários no detalhe do evento
- [x] T026 [P] Votação nas ideias de rolê
- [x] T027 [P] Histórico de alterações do evento (trigger + UI)
- [x] T028 Fotos via Supabase Storage no evento
- [x] T029 Página Memórias (eventos `completed` + participantes + fotos)
- [x] T030 Nav/home com link Memórias + marcar evento como memória

## Phase 11: MVP 3 — IA, lugares, filtros, sugestões

- [x] T031 Schema: `period`/`ambiance` em ideias + RPC `draw_outing_idea` com filtros e anti-repetição
- [x] T032 [P] Edge Function `suggest-places` (IA + PlacesProvider Geoapify; secrets no servidor)
- [x] T033 [P] Camada frontend `features/ai` + `features/places` (PlacesProvider)
- [x] T034 Página Sugestões (`/sugestoes`) — pedir sugestão, salvar ideia / criar evento
- [x] T035 Filtros inteligentes no sorteio e na lista de ideias
- [x] T036 Nav/home + README/quickstart MVP 3

## Phase 12: MVP 4 — Despesas, notificações, realtime, estatísticas, badges, PWA

- [x] T037 Schema + RLS + Realtime: `event_expenses`, `expense_participants`, `notifications` + triggers
- [x] T038 [P] RPCs `mark_notifications_read`, `get_group_stats`, `get_my_badges`
- [x] T039 [P] Despesas no detalhe do evento (lançar, rateio, saldos)
- [x] T040 [P] Notificações (lista + sino + marcar lidas) com Realtime
- [x] T041 Realtime no detalhe do evento (comentários, presença, despesas)
- [x] T042 Página Estatísticas + badges (`/estatisticas`)
- [x] T043 PWA (vite-plugin-pwa, manifest, service worker, ícones)
- [x] T044 Nav/home + README/quickstart MVP 4

## Pendências (pós-MVP 4)

- Push notifications nativas (Web Push / FCM)
- Testes automatizados e CI
- Projeto Supabase real do usuário (migrations + Edge Function precisam ser aplicadas/deployadas)
