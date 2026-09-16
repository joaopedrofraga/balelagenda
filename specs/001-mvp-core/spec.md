# Feature Specification: Balelagenda MVP Core

**Feature Branch**: `001-mvp-core`

**Created**: 2026-09-16

**Status**: Draft

**Input**: Implementar Balelagenda (MVP 1) como SPA React + Supabase client-only (sem backend próprio), com Auth, PostgREST e RLS.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Login com Supabase Auth (Priority: P1)

Como membro, quero entrar com e-mail/username e senha (Supabase Auth) para acessar a agenda privada.

**Why this priority**: Sem autenticação não há sistema privado.

**Independent Test**: Seed/admin existente faz login, vê dashboard, logout.

**Acceptance Scenarios**:

1. **Given** perfil ativo vinculado a auth.users, **When** login com credenciais válidas, **Then** sessão Supabase é criada e rotas protegidas abrem.
2. **Given** credenciais inválidas, **When** tenta login, **Then** erro genérico amigável.
3. **Given** `profiles.active = false`, **When** autentica ou carrega app, **Then** acesso aos dados é bloqueado (RLS + gate na UI) e logout é forçado.
4. **Given** sessão válida, **When** logout, **Then** sessão encerra e rotas exigem novo login.

---

### User Story 2 - Administração de usuários / convites (Priority: P1)

Como admin, quero convidar, editar, desativar e reativar membros sem service_role no browser.

**Why this priority**: Sem auto-cadastro aberto; grupo é provisionado.

**Independent Test**: Admin cria convite; convidado completa signup; admin desativa e acesso some.

**Acceptance Scenarios**:

1. **Given** admin, **When** cria convite (e-mail, username, role), **Then** registro fica em `invites` consumível uma vez.
2. **Given** convite válido, **When** convidado faz signup, **Then** perfil é criado ativo e convite marcado como usado.
3. **Given** usuário comum, **When** tenta mutações admin, **Then** RLS rejeita.
4. **Given** desativação, **When** admin define `active=false`, **Then** usuário deixa de ler/escrever dados do grupo; último admin ativo não pode ser desativado.

---

### User Story 3 - Grupo compartilhado (Priority: P2)

Como usuário autenticado ativo, quero ver o grupo padrão e membros.

**Independent Test**: Após login, tela Grupo lista membros.

**Acceptance Scenarios**:

1. **Given** membership ativa, **When** abre Grupo, **Then** vê nome do grupo e membros ativos.
2. **Given** sem membership, **When** consulta eventos, **Then** RLS retorna vazio/erro.

---

### User Story 4 - Agenda e eventos (Priority: P1)

Como membro, quero criar, editar, cancelar e listar eventos do grupo.

**Independent Test**: Criar → listar → editar → cancelar (status `cancelled`).

**Acceptance Scenarios**:

1. **Given** membro, **When** cria evento, **Then** `created_by` = auth.uid() e aparece para o grupo.
2. **Given** evento, **When** edita, **Then** `updated_at` muda.
3. **Given** evento, **When** cancela, **Then** status `cancelled` sem delete físico.

---

### User Story 5 - Presença (Priority: P2)

Como membro, quero marcar Vou / Talvez / Não vou e ver contagens.

**Acceptance Scenarios**:

1. **Given** evento, **When** marca `going`, **Then** contagem atualiza.
2. **Given** já respondeu, **When** muda status, **Then** permanece uma linha por (event, user).

---

### User Story 6 - Ideias e sorteio (Priority: P2)

Como membro, quero cadastrar ideias e sortear um rolê, podendo criar evento a partir do resultado.

**Acceptance Scenarios**:

1. **Given** membro, **When** cadastra ideia, **Then** aparece na lista.
2. **Given** ideias ativas, **When** sorteia, **Then** uma ideia é escolhida e registrada em histórico (via RPC se necessário).
3. **Given** resultado, **When** cria evento, **Then** título/categoria vêm da ideia.

---

### Edge Cases

- Convite expirado/usado: signup falha com mensagem clara.
- Anon key apenas: tentativas de bypass via REST sem JWT falham por RLS.
- Sorteio sem ideias: estado vazio amigável.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: App MUST ser SPA React falando só com Supabase via `supabase-js`.
- **FR-002**: Auth MUST usar Supabase Auth; MUST NOT haver API própria hospedada pelo time.
- **FR-003**: Autorização MUST ser RLS (+ RPC SECURITY DEFINER quando inevitável).
- **FR-004**: Client env MUST ser apenas URL + anon key.
- **FR-005**: Admins MUST gerenciar perfis/convites conforme US2.
- **FR-006**: Membros MUST CRUD eventos (cancel = status), presença, ideias e sorteio.
- **FR-007**: Soft deactivate profiles; last admin protected.
- **FR-008**: Mobile-first UI com loading/erro/feedback.

### Key Entities

- **auth.users** (Supabase) + **profiles** (app)
- **invites**, **groups**, **group_members**
- **events**, **event_attendees**
- **outing_ideas**, **outing_history**

## Success Criteria *(mandatory)*

- **SC-001**: Deploy estático + Supabase cloud funciona sem servidor de app.
- **SC-002**: Usuário comum não consegue mutações admin (RLS).
- **SC-003**: Fluxo convite → signup → login → criar evento → presença → sorteio completo.
- **SC-004**: Sem `service_role` no bundle frontend.

## Assumptions

- Pivot consciente: spec original pedia auth custom + Edge Functions; restrição de hospedagem obriga Supabase Auth + RLS.
- Primeiro admin criado no Dashboard Supabase + SQL de perfil/grupo.
- SQL functions no Postgres (RPC) são permitidas (fazem parte do Supabase, não são “servidor próprio”).
