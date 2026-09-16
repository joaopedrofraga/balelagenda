# Contracts: Supabase Client + Edge Functions (auth custom)

Base: `@supabase/supabase-js` with **anon key** + **JWT custom** (`accessToken` em localStorage).
Mutations sujeitas a RLS. **Sem** Supabase Auth (`signInWithPassword` / `signUp` / `onAuthStateChange`).

## Auth (Edge Functions)

| Function | Auth | Body | Resultado |
|----------|------|------|-----------|
| `login` | público (`verify_jwt=false`) | `{ identifier, password }` | `{ access_token, expires_at, user }` |
| `admin-create-user` | JWT admin | `{ name, username, email?, password, role }` | `{ user }` |
| `admin-set-password` | JWT admin | `{ user_id, password }` | `{ ok: true }` |
| `change-password` | JWT user | `{ current_password, new_password }` | `{ ok: true }` |

- Senhas hasheadas com **bcrypt** só nas Functions (`password_hash` em `profiles`).
- JWT assinado com **`JWT_SECRET`** (= JWT Secret do projeto Supabase): `sub` = user id, `role` = `authenticated` → `auth.uid()` nas policies.
- Client guarda token em `localStorage` (`balelagenda_access_token`); logout limpa storage.
- Mensagens de login genéricas + rate-limit básico na Function.

## Profiles / Admin

- `from('profiles').select(...)` — **sem** `password_hash` (coluna revogada para `authenticated`/`anon`)
- `from('profiles').update({ name, active, role, avatar_path })` — self / admin via RLS
- Criação de usuário e reset de senha: **somente** Edge Functions (service_role)

## Groups / Events / Outing / MVP 2–4

Inalterados em relação ao PostgREST + RLS (`auth.uid()` continua válido com JWT custom).

## Env (frontend)

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Secrets (Edge Functions)

```text
JWT_SECRET                 # Project Settings → API → JWT Secret (obrigatório para auth)
SUPABASE_URL               # injetado pelo runtime
SUPABASE_ANON_KEY          # injetado
SUPABASE_SERVICE_ROLE_KEY  # injetado (só nas Functions)
# suggest-places (opcional): AI_API_KEY, PLACES_API_KEY, …
```
