# Auth Edge Functions

Custom auth (sem Supabase Auth). Shared helpers: `_shared/auth.ts`.

## Secrets

| Name | Value |
|------|--------|
| `JWT_SECRET` | Project Settings → API → **JWT Secret** (obrigatório) |
| `SUPABASE_*` | Injetados pelo runtime das Functions |

## Deploy

```bash
supabase secrets set JWT_SECRET="..."
supabase functions deploy login
supabase functions deploy admin-create-user
supabase functions deploy admin-set-password
supabase functions deploy change-password
```

`verify_jwt = false` no `config.toml` — validação manual com o mesmo secret (login público; demais exigem Bearer JWT admin/user).

## Endpoints

- `POST /functions/v1/login` — `{ identifier, password }`
- `POST /functions/v1/admin-create-user` — Bearer admin + body usuário/senha
- `POST /functions/v1/admin-set-password` — Bearer admin
- `POST /functions/v1/change-password` — Bearer user

Password hashing: **bcrypt** → coluna `profiles.password_hash`.
