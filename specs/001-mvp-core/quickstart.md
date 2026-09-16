# Quickstart / Produção — Balelagenda

SPA React (Vite) + Supabase (Postgres/RLS/Storage/Realtime/Edge Functions).  
**Auth custom** — `profiles.password_hash` + Edge Functions; JWT em `localStorage`.  
**Não** use Supabase Auth (Dashboard → Authentication → Users, Confirm email, convites, `signInWithPassword`, etc.).

Este arquivo é o **runbook de produção completo** (do zero). Use a ordem abaixo.

---

# Produção — runbook completo (do zero)

Ordem importa. Não pule secrets das Edge Functions antes do deploy de `login`.

## 1. Visão geral da arquitetura

```text
Browser (SPA Vite em Vercel)
  │  VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
  │  Authorization: Bearer <JWT custom>  (localStorage: balelagenda_access_token)
  ├─► PostgREST / Storage / Realtime     (RLS via auth.uid() = claim `sub`)
  └─► Edge Functions
        login                (público)
        admin-create-user    (JWT admin)
        admin-set-password   (JWT admin)
        change-password      (JWT user)
        suggest-places       (opcional; IA/Places)

Vercel Cron ──► /api/keepalive  (SUPABASE_SERVICE_ROLE_KEY + CRON_SECRET)
```

| Componente | Papel |
|---|---|
| `web/` | Frontend estático (Vite). Root Directory na Vercel = **`web`** |
| Postgres + RLS | Dados e autorização; `auth.uid()` lido do JWT custom |
| Storage | Buckets `event-photos`, `avatars` (criados pelas migrations) |
| Edge Functions | Login, criar usuário, senhas; hash bcrypt; assinatura JWT |
| `web/api/keepalive.ts` | Ping diário para evitar pause do free tier |

### O que NÃO usar

- **Supabase Auth** (`auth.users`, Authentication → Users, providers, Confirm email, magic link, invite e-mail)
- `signInWithPassword` / `signUp` / `onAuthStateChange` no client
- Colocar `service_role`, `JWT_SECRET` ou `CRON_SECRET` no frontend / variáveis `VITE_*`
- Criar o primeiro admin manualmente no Dashboard Auth — o **seed** cria `admin` / `Admin@ChangeMe1!`
- Backend próprio fora do Supabase/Vercel Functions

### Fluxo de login (resumo)

1. SPA chama `POST …/functions/v1/login` com `{ identifier, password }`
2. Function valida bcrypt em `profiles.password_hash` (service_role)
3. Emite JWT HS256 com `JWT_SECRET` (= JWT Secret do projeto): `sub` = user id, `role` = `authenticated`
4. Client guarda token em `localStorage` e o `@supabase/supabase-js` usa `accessToken` em toda request
5. PostgREST popula `auth.uid()` → RLS funciona

Arquivos de referência: `supabase/functions/_shared/auth.ts`, `web/src/lib/supabase.ts`, `web/src/features/auth/sessionStorage.ts`, `specs/001-mvp-core/contracts/supabase.md`.

---

## 2. Pré-requisitos

| Item | Para quê |
|---|---|
| Conta [Supabase](https://supabase.com) | Projeto cloud (DB, Storage, Functions) |
| Conta [Vercel](https://vercel.com) | Host da SPA + Cron keep-alive |
| Conta [GitHub](https://github.com) | Repo conectado à Vercel |
| [Supabase CLI](https://supabase.com/docs/guides/cli) instalada e logada | Deploy das Edge Functions + secrets |
| Node.js 20+ (recomendado) | Build local / gerar hash bcrypt se precisar |
| Navegador + `curl` (ou equivalente) | Smoke tests |

Opcional (só se for usar sugestões IA/Places): chave OpenAI-compatible + Geoapify (ou outro provider).

---

## 3. Criar projeto Supabase e anotar credenciais

1. Em https://supabase.com → **New project** (região próxima; anote a senha do DB se quiser acesso direto — não é necessária para este runbook).
2. Aguarde o projeto ficar **Active**.
3. Vá em **Project Settings → API** e anote:

| Valor | Onde usar depois |
|---|---|
| **Project URL** (`https://xxxx.supabase.co`) | `VITE_SUPABASE_URL`, `SUPABASE_URL` (keepalive), Functions |
| **anon `public` key** | `VITE_SUPABASE_ANON_KEY` (só no build do frontend) |
| **service_role `secret` key** | Só Vercel keepalive + já injetada nas Edge Functions pelo runtime — **nunca** no browser |
| **JWT Secret** (JWT Settings) | Secret das Edge Functions: **`JWT_SECRET`** — **obrigatório** e **idêntico** ao do projeto |

4. **Não** configure Authentication providers, e-mail templates, Confirm email, ou Users no Dashboard Auth.
5. Guarde as chaves em um gerenciador de senhas / notas privadas — não commit no Git.

**Armadilha:** se `JWT_SECRET` das Functions ≠ JWT Secret do projeto, o login “funciona” na Function mas **todas** as queries PostgREST falham no RLS (`auth.uid()` nulo / JWT rejeitado).

---

## 4. Aplicar migrations `001→007` + seed

No **SQL Editor** do Dashboard (recomendado no primeiro setup), execute **um arquivo por vez**, na ordem:

| # | Arquivo | O que faz |
|---|---|---|
| 1 | `supabase/migrations/20260916000001_init_schema.sql` | Schema base; `profiles` com **`password_hash`**; sem `auth.users` |
| 2 | `supabase/migrations/20260916000002_rls_policies.sql` | RLS; **revoke** de `password_hash` para `anon`/`authenticated` |
| 3 | `supabase/migrations/20260916000003_rpcs.sql` | RPCs (sorteio, etc.) |
| 4 | `supabase/migrations/20260916000004_mvp2_comments_memories.sql` | Comentários/memórias + bucket **`event-photos`** |
| 5 | `supabase/migrations/20260916000005_mvp3_ai_places_filters.sql` | Filtros / places |
| 6 | `supabase/migrations/20260916000006_mvp4_expenses_notifications_stats.sql` | Despesas, notificações, stats + **Realtime publication** |
| 7 | `supabase/migrations/20260916000007_profile_avatars.sql` | `avatar_path` + bucket **`avatars`** |
| 8 | `supabase/seed.sql` | Grupo **Balela** + admin seed |

Alternativa CLI (projeto linkado): `supabase db push` e depois cole/execute o `seed.sql` (o seed não vai automaticamente em todos os fluxos de push — confirme).

### Checks obrigatórios (SQL Editor)

```sql
-- Grupo seed
select id, name from public.groups;
-- Esperado: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa | Balela

-- Admin seed (sem selecionar password_hash no client depois; aqui no SQL Editor ok)
select id, username, role, active, email
from public.profiles
where username = 'admin';
-- Esperado: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb | admin | admin | true

select group_id, user_id, role, active
from public.group_members
where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
-- Esperado: membership owner no grupo padrão

-- Coluna de senha existe
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name = 'password_hash';
```

### Credenciais do seed

| Campo | Valor |
|---|---|
| username | `admin` |
| senha | `Admin@ChangeMe1!` |
| e-mail | `admin@example.com` |
| id | `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` |

**Troque a senha** após o primeiro login (Perfil → Alterar senha, ou Admin → Redefinir senha).

Para gerar outro hash bcrypt (cost 10), na pasta `web/`:

```powershell
cd web
node --input-type=module -e "import bcrypt from 'bcryptjs'; console.log(bcrypt.hashSync('SuaSenhaSegura', 10))"
```

(Se `bcryptjs` não estiver nas deps do frontend, use o hash já documentado no `seed.sql` ou `npx` conforme comentário do seed.)

---

## 5. Storage buckets (automáticos)

Não crie buckets manualmente no Dashboard se as migrations rodaram com sucesso.

| Bucket | Migration | Uso |
|---|---|---|
| `event-photos` | `20260916000004_mvp2_comments_memories.sql` | Fotos de eventos |
| `avatars` | `20260916000007_profile_avatars.sql` | Avatar de perfil |

### Check

Dashboard → **Storage**: devem aparecer `event-photos` e `avatars` (públicos para leitura conforme policies das migrations).

```sql
select id, name, public from storage.buckets
where id in ('event-photos', 'avatars');
```

---

## 6. Realtime publication (check)

A migration `006` adiciona à publication `supabase_realtime`:

- `public.notifications`
- `public.event_comments`
- `public.event_attendees`
- `public.event_expenses`

### Check

```sql
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;
```

Se alguma tabela faltar, reexecute o bloco Realtime do arquivo `20260916000006_mvp4_expenses_notifications_stats.sql` (os `DO $$ … EXCEPTION` são idempotentes).

No Dashboard → **Database → Publications** (ou Realtime), confirme as mesmas tabelas.

---

## 7. Secrets das Edge Functions

Na raiz do repo, com CLI logada e projeto linkado:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
```

(`project_ref` = subdomínio do URL, ex.: `xxxx` em `https://xxxx.supabase.co`.)

### Obrigatório (auth)

```bash
supabase secrets set JWT_SECRET="cole-aqui-o-JWT-Secret-do-projeto-Settings-API"
```

| Secret | Valor | Notas |
|---|---|---|
| `JWT_SECRET` | JWT Secret do projeto | **Deve ser idêntico** ao Settings → API → JWT Settings |
| `SUPABASE_URL` | (automático) | Injetado pelo runtime |
| `SUPABASE_ANON_KEY` | (automático) | Injetado |
| `SUPABASE_SERVICE_ROLE_KEY` | (automático) | Injetado — Functions usam para ler/escrever `password_hash` |

Também dá para setar no Dashboard → **Edge Functions → Secrets**.

### Opcional (`suggest-places`)

```bash
supabase secrets set AI_API_KEY="..." PLACES_API_KEY="..." PLACES_PROVIDER="geoapify" DEFAULT_CITY="São Paulo, Brazil"
```

Outros opcionais (ver `web/.env.example` / `supabase/functions/suggest-places`): `AI_BASE_URL`, `AI_MODEL`, `DEFAULT_LAT`, `DEFAULT_LON`.

`config.toml` define `verify_jwt = false` para as Functions de auth e `suggest-places` — a validação JWT é feita no código compartilhado (`_shared/auth.ts`), porque o login é público e o gateway JWT do Supabase Auth **não** é o modelo deste app.

---

## 8. Deploy de TODAS as Edge Functions necessárias

Na **raiz** do repositório (`C:\_Dev\balelagenda`):

```bash
# Auth (obrigatório)
supabase functions deploy login
supabase functions deploy admin-create-user
supabase functions deploy admin-set-password
supabase functions deploy change-password

# Opcional (sugestões de lugares / IA)
supabase functions deploy suggest-places
```

Endpoints esperados:

| Function | Método | Auth |
|---|---|---|
| `…/functions/v1/login` | POST | público (`apikey` anon + body) |
| `…/functions/v1/admin-create-user` | POST | Bearer JWT admin |
| `…/functions/v1/admin-set-password` | POST | Bearer JWT admin |
| `…/functions/v1/change-password` | POST | Bearer JWT user |
| `…/functions/v1/suggest-places` | POST | conforme implementação (opcional) |

Código compartilhado: `supabase/functions/_shared/auth.ts` (deployado junto com cada function que importa).

**Armadilha:** deployar só o frontend sem as Functions → tela de login sempre falha. Deployar Functions sem `JWT_SECRET` → erro 500 no login.

---

## 9. Verificar login admin seed (antes da Vercel)

Com as Functions no ar, teste o login direto (substitua URL e anon key):

```bash
curl -s -X POST "https://SEU_PROJECT.supabase.co/functions/v1/login" ^
  -H "Content-Type: application/json" ^
  -H "apikey: SUA_ANON_KEY" ^
  -H "Authorization: Bearer SUA_ANON_KEY" ^
  -d "{\"identifier\":\"admin\",\"password\":\"Admin@ChangeMe1!\"}"
```

(PowerShell: use `` ` `` para continuar linha, ou um único comando.)

Resposta esperada (campos principais): `access_token`, `expires_at`, `user.username` = `admin`, `user.role` = `admin`.

Se falhar:

1. Seed rodou? (`profiles` com `admin`)
2. Function `login` deployada?
3. `JWT_SECRET` setado e igual ao JWT Secret do projeto?
4. Senha exatamente `Admin@ChangeMe1!` (case-sensitive)

Opcional — smoke local do frontend:

```powershell
cd web
copy .env.example .env
# preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Abra http://localhost:5173 → login `admin` / `Admin@ChangeMe1!`.

---

## 10. GitHub

1. Crie/use um repositório GitHub e faça push do código (sem `.env`, sem secrets).
2. Confirme que estão no repo (e versionados):
   - `supabase/migrations/*`
   - `supabase/seed.sql`
   - `supabase/functions/**`
   - `web/` (incluindo `api/keepalive.ts`, `vercel.json`)
3. **Não** commitar: `web/.env`, chaves `service_role`, `JWT_SECRET`, `CRON_SECRET`.

---

## 11. Deploy Vercel

1. [Vercel](https://vercel.com) → **Add New Project** → importe o repo GitHub.
2. **Root Directory** = **`web`** (obrigatório; o `vercel.json` e `api/` ficam sob `web/`).
3. Framework Preset: Vite (ou Other). Build:
   - **Install:** `npm install`
   - **Build:** `npm run build` (`tsc -b && vite build`)
   - **Output:** `dist`
4. Environment Variables (Production + Preview se quiser testar PRs):

| Variável | Escopo | Obrigatória | Uso |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Build + Runtime do static | Sim | Client React |
| `VITE_SUPABASE_ANON_KEY` | Build + Runtime do static | Sim | Client React |
| `SUPABASE_URL` | Runtime (Function) | Sim (keepalive) | `web/api/keepalive.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Runtime (Function) | Sim (keepalive) | Ping com service role |
| `CRON_SECRET` | Runtime (Function) | Sim (keepalive) | Auth do Cron; string longa aleatória |

Gere `CRON_SECRET`, por exemplo:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

5. Deploy. Anote a URL: `https://SEU-APP.vercel.app`.

**Armadilhas Vercel:**

- Root Directory errado (`/` em vez de `web`) → build não acha `package.json` / cron não registra.
- Esquecer `VITE_*` no **build** → app sobe sem URL/anon e login quebra.
- Prefixar `SUPABASE_SERVICE_ROLE_KEY` com `VITE_` → vazamento no bundle; **nunca faça isso**.
- Variáveis só em Production e testar Preview → Preview sem env.

---

## 12. Keep-alive cron + teste curl

Arquivo: `web/api/keepalive.ts`. Agenda em `web/vercel.json`:

```json
"crons": [{ "path": "/api/keepalive", "schedule": "0 12 * * *" }]
```

(UTC — meio-dia. Ajuste se quiser.)

O Cron da Vercel envia `Authorization: Bearer <CRON_SECRET>` quando `CRON_SECRET` está nas env vars do projeto.

### Teste manual

```bash
curl -s -H "Authorization: Bearer SEU_CRON_SECRET" https://SEU-APP.vercel.app/api/keepalive
```

Esperado: `{"ok":true,"at":"…"}`.

| Status | Causa típica |
|---|---|
| 401 | `CRON_SECRET` ausente/diferente do header |
| 500 | Falta `SUPABASE_URL` ou `SUPABASE_SERVICE_ROLE_KEY` |
| 502 | Service role não alcança a tabela `groups` (projeto pausado / chave errada) |

Sem keepalive, o **free tier** do Supabase pode pausar após ~7 dias sem atividade. A SPA sozinha **não** resolve isso.

---

## 13. Smoke test completo pós-deploy

Execute na URL da Vercel (e Functions no Supabase):

### Auth / sessão

- [ ] Login com `admin` / `Admin@ChangeMe1!`
- [ ] Refresh (F5) mantém sessão (`localStorage`: `balelagenda_access_token`)
- [ ] Logout limpa storage e volta à tela de login
- [ ] Login com username **ou** e-mail (`admin@example.com`) funciona
- [ ] Senha errada → mensagem genérica (sem vazar se o user existe)

### Admin

- [ ] Administração → criar usuário (nome, username, senha ≥ 8 chars)
- [ ] Logout → login com o usuário novo
- [ ] Admin desativa usuário → login desse usuário falha; reativar → ok
- [ ] Admin → redefinir senha → novo login com a senha nova
- [ ] Perfil → alterar senha própria (`change-password`)

### Dados / features

- [ ] Grupo visível; criar/editar evento
- [ ] Presença / ideias / sorteio
- [ ] Comentários, fotos (`event-photos`), avatar (`avatars`) se no escopo do MVP
- [ ] Despesas / notificações (Realtime) se no escopo
- [ ] (Opcional) sugestão de lugares se `suggest-places` + secrets

### Infra

- [ ] `GET /api/keepalive` com Bearer → `ok: true`
- [ ] Network: requests PostgREST com `Authorization: Bearer eyJ…` (JWT), **sem** `password_hash` nos JSON de `profiles`
- [ ] Trocar senha do admin seed

---

## 14. Troubleshooting

| Sintoma | Verificar |
|---|---|
| Login sempre “Usuário ou senha inválidos” | Seed? Hash/senha? Function `login` deployada? Body `{ identifier, password }`? |
| Login 500 / “Falha no login” | Secret `JWT_SECRET` ausente; logs da Function no Dashboard |
| Login ok, mas RLS bloqueia tudo (select vazio / 401) | `JWT_SECRET` ≠ JWT Secret do projeto → PostgREST não aceita o token / `auth.uid()` nulo |
| CORS na Function | OPTIONS deve responder; `_shared` já envia `Access-Control-Allow-Origin: *` |
| Criar usuário 401/403 | Token expirado; user não é `role=admin`; Function `admin-create-user` não deployada |
| `password_hash` aparece no Network do browser | Bug no `select` do client — migration 002 revoga a coluna; selects devem usar colunas públicas |
| UPDATE de senha via PostgREST falha | Esperado — trigger `forbid_password_hash_client_update`; use Edge Functions |
| Sessão some no refresh | `localStorage` bloqueado; token expirado (TTL ~30 dias); chaves `balelagenda_*` |
| Rate limit 429 no login | Função limita tentativas por IP/identifier (~10/min por isolate) |
| Upload Storage falha | Buckets das migrations 004/007; JWT válido; path com `user_id` conforme policies |
| Realtime não atualiza | Publication (seção 6); cliente subscribed; RLS ainda se aplica |
| Keepalive 401/500/502 | Seção 12; projeto Supabase pausado |
| Build Vercel sem env | `VITE_*` precisam existir **no momento do build** |
| Confundiu com Auth antiga | **Ignore** Authentication → Users, Confirm email, invites, “create user” no Auth Dashboard |

Logs úteis:

- Supabase → Edge Functions → Logs (`login`, etc.)
- Vercel → Deployments → Function logs (`/api/keepalive`)
- Browser DevTools → Network + Application → Local Storage

---

## 15. Checklist final

- [ ] Projeto Supabase criado; URL, anon, service_role, **JWT Secret** anotados
- [ ] Migrations `001` … `007` aplicadas sem erro
- [ ] `seed.sql` aplicado; admin `admin` / `Admin@ChangeMe1!` existe
- [ ] Buckets `event-photos` e `avatars` visíveis
- [ ] Realtime publication com as 4 tabelas da migration 006
- [ ] `JWT_SECRET` setado (= JWT Secret do projeto)
- [ ] Functions deployadas: `login`, `admin-create-user`, `admin-set-password`, `change-password`
- [ ] (Opcional) `suggest-places` + secrets de IA/Places
- [ ] `curl` de login admin retorna `access_token`
- [ ] Repo no GitHub (sem secrets)
- [ ] Vercel: Root = `web`; env `VITE_*` + `SUPABASE_*` + `CRON_SECRET`
- [ ] Deploy OK; app abre na URL da Vercel
- [ ] Keepalive responde `ok: true`
- [ ] Smoke test (seção 13) completo
- [ ] Senha do admin seed alterada

---

## Setup local rápido (opcional)

Depois das seções 3–9 (Supabase + Functions):

```powershell
cd web
copy .env.example .env
# VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Variáveis documentadas em `web/.env.example`.

---

## Referências no repo

| Arquivo | Conteúdo |
|---|---|
| `supabase/seed.sql` | Grupo + admin + hash bcrypt |
| `supabase/config.toml` | `verify_jwt = false` nas Functions |
| `supabase/functions/README.md` | Deploy auth |
| `supabase/functions/_shared/auth.ts` | JWT + bcrypt + rate limit |
| `web/api/keepalive.ts` | Cron keep-alive |
| `web/vercel.json` | Cron + SPA rewrites |
| `web/.env.example` | Env frontend / notas de secrets |
| `specs/001-mvp-core/contracts/supabase.md` | Contratos das Functions |
