# Research: Balelagenda SPA + Supabase

## Decision: No custom backend

**Choice**: React SPA + supabase-js only.  
**Rationale**: User has no server to host an API.  
**Alternatives rejected**: Hono/Node API, ASP.NET, Edge Functions as app BFF.

## Decision: Supabase Auth (pivot)

**Choice**: Supabase Auth email/password.  
**Rationale**: Secure password handling without service_role in the client.  
**Note**: Overrides original “não usar Supabase Auth” which assumed a custom backend.  
**Alternatives rejected**: Custom password_hash tables (unsafe with anon key alone).

## Decision: Invites for provisioning

**Choice**: `invites` table + signup flow; first admin via Dashboard.  
**Rationale**: Creating Auth users requires Admin API (service_role). Invites allow open signup only when token is valid, enforced by trigger/RPC.  
**Alternatives rejected**: Public open signup; embedding service_role.

## Decision: RLS + RPC for sorteio / username login

**Choice**: Policies on all tables; RPCs `resolve_login_identifier`, `draw_outing_idea`, `consume_invite_on_signup` as needed.  
**Rationale**: Keep privileged logic in Postgres, still “inside Supabase”, not a separate host.

## Decision: Edge Functions only for third-party secrets (MVP 3)

**Choice**: `suggest-places` Edge Function holds `AI_API_KEY` / `PLACES_API_KEY`.  
**Rationale**: Spec §40 forbids private keys in the browser; user has no custom server.  
**Alternatives rejected**: `VITE_*` for secret keys; inventing places client-side.
