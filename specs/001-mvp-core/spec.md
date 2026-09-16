# Feature Specification: Balelagenda MVP Core

**Feature Branch**: `001-mvp-core`

**Created**: 2026-09-16

**Status**: Draft

**Input**: Implementar Balelagenda (MVP 1) como SPA React + Supabase (PostgREST/RLS/Edge Functions; sem backend próprio; sem Supabase Auth).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Login com senha (auth custom) (Priority: P1)

Como membro, quero entrar com username/e-mail e senha para acessar a agenda privada, com sessão persistente.

**Why this priority**: Sem autenticação não há sistema privado.

**Independent Test**: Seed/admin existente faz login, vê dashboard, refresh mantém sessão, logout.

**Acceptance Scenarios**:

1. **Given** perfil ativo com `password_hash`, **When** login com username/senha válidos via Edge Function, **Then** JWT é emitido, sessão persiste no client e rotas protegidas abrem.
2. **Given** credenciais inválidas ou usuário inativo, **When** tenta login, **Then** erro genérico e sem token.
3. **Given** `profiles.active = false`, **When** autentica ou carrega app, **Then** acesso aos dados é bloqueado (RLS + gate na UI) e logout é forçado.
4. **Given** sessão válida, **When** logout, **Then** storage limpa e rotas exigem novo login.

---

### User Story 2 - Administração de usuários (Priority: P1)

Como admin, quero criar usuários (com senha), editar, desativar e reativar membros sem service_role no browser.

**Why this priority**: Sem auto-cadastro aberto; grupo é provisionado pelo admin.

**Independent Test**: Admin cria usuário com senha; usuário faz login; admin desativa e acesso some.

**Acceptance Scenarios**:

1. **Given** admin, **When** cria usuário (nome, username, senha, role), **Then** perfil ativo é gravado com `password_hash` (Edge Function).
2. **Given** admin, **When** redefine senha de um usuário, **Then** novo hash é gravado e o login antigo falha.
3. **Given** usuário comum, **When** tenta mutações admin, **Then** RLS / Function rejeita.
4. **Given** desativação, **When** admin define `active=false`, **Then** usuário deixa de autenticar e de ler/escrever; último admin ativo não pode ser desativado.

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

- Usuário inativo: login e RLS falham.
- Anon key apenas: tentativas de bypass via REST sem JWT falham por RLS.
- Sorteio sem ideias: estado vazio amigável.
- `password_hash` nunca retornado ao client (grants de coluna + selects explícitos).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: App MUST ser SPA React falando só com Supabase via `supabase-js` + Edge Functions.
- **FR-002**: Auth MUST ser custom (`profiles.password_hash` + Edge Functions JWT); MUST NOT usar Supabase Auth; MUST NOT haver API própria hospedada pelo time.
- **FR-003**: Autorização MUST ser RLS (+ RPC SECURITY DEFINER quando inevitável); JWT custom popula `auth.uid()`.
- **FR-004**: Client env MUST ser apenas URL + anon key (`JWT_SECRET` / `service_role` só nas Functions/servidor).
- **FR-005**: Admins MUST criar/editar/desativar usuários e redefinir senhas conforme US2.
- **FR-006**: Membros MUST CRUD eventos (cancel = status), presença, ideias e sorteio.
- **FR-007**: Soft deactivate profiles; last admin protected.
- **FR-008**: Mobile-first UI com loading/erro/feedback; sessão persistente + logout.

### Key Entities

- **profiles** (com `password_hash`; sem `auth.users`)
- **groups**, **group_members**
- **events**, **event_attendees**
- **outing_ideas**, **outing_history**

## Success Criteria *(mandatory)*

- **SC-001**: Deploy estático + Supabase cloud funciona sem servidor de app próprio.
- **SC-002**: Usuário comum não consegue mutações admin (RLS / Functions).
- **SC-003**: Fluxo admin cria usuário → login → criar evento → presença → sorteio completo.
- **SC-004**: Sem `service_role` / `JWT_SECRET` / `password_hash` no bundle frontend.

## Assumptions

- Auth custom via Edge Functions do Supabase (não é backend hospedado pelo usuário).
- Primeiro admin via `supabase/seed.sql` (username + bcrypt hash documentado).
- SQL functions no Postgres (RPC) e Edge Functions são permitidas (fazem parte do Supabase).
