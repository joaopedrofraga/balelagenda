# Balelagenda — Especificação Completa do Projeto

## 1. Visão geral

O **Balelagenda** será uma aplicação web privada para uso entre amigos, funcionando como uma agenda social compartilhada.

O objetivo principal é centralizar em um único lugar a organização de rolês, eventos, ideias e confirmações de presença do grupo, evitando que tudo fique espalhado em conversas de WhatsApp.

O sistema deverá ser simples, divertido, responsivo e barato de manter.

A aplicação será desenvolvida inicialmente com:

- React;
- TypeScript;
- Supabase PostgreSQL;
- Supabase Storage;
- Supabase Edge Functions;
- APIs externas opcionais para IA e busca de lugares.

**O Supabase Auth não será utilizado.**

A autenticação, usuários, senhas, sessões e permissões serão controlados pela própria aplicação.

---

# 2. Objetivo

O Balelagenda deverá permitir que um grupo de amigos:

- visualize uma agenda compartilhada;
- crie eventos;
- edite eventos;
- confirme presença;
- veja quem criou cada evento;
- acompanhe alterações;
- cadastre ideias de rolê;
- vote em ideias;
- sorteie um rolê aleatoriamente;
- transforme uma ideia em evento;
- registre comentários;
- mantenha memórias de eventos passados;
- armazene fotos;
- futuramente utilize IA para sugerir lugares;
- futuramente controle despesas;
- possua administração própria de usuários.

---

# 3. Nome do produto

Nome oficial:

```text
Balelagenda
```

O nome deverá ser utilizado:

- no título da página;
- no cabeçalho;
- no login;
- na documentação;
- no nome do projeto;
- nas mensagens da aplicação;
- no repositório, quando conveniente.

---

# 4. Público-alvo

Inicialmente o sistema será utilizado apenas por um pequeno grupo de amigos.

Características esperadas:

- poucos usuários;
- poucos eventos por semana;
- baixo volume de requisições;
- acesso privado;
- foco em celular;
- baixo custo de infraestrutura.

A arquitetura poderá permitir múltiplos grupos futuramente, mesmo que no início exista somente um.

---

# 5. Stack sugerida

## Front-end

- React;
- TypeScript;
- Vite;
- React Router;
- Tailwind CSS;
- shadcn/ui opcional;
- React Hook Form;
- Zod;
- TanStack Query.

## Backend e dados

- Supabase PostgreSQL;
- Supabase Edge Functions;
- Supabase Storage;
- Supabase Realtime opcional.

## Importante

O Supabase será utilizado como infraestrutura de banco e serviços, mas:

```text
NÃO utilizar Supabase Auth.
```

---

# 6. Arquitetura de alto nível

```text
React
  |
  v
API / Supabase Edge Functions
  |
  +--> PostgreSQL (Supabase)
  |
  +--> Storage
  |
  +--> IA externa
  |
  +--> API de lugares
```

O React não deverá acessar diretamente tabelas sensíveis usando permissões irrestritas.

A lógica sensível deverá ficar no backend/Edge Functions.

---

# 7. Autenticação própria

O Balelagenda deverá implementar autenticação própria.

Cada usuário possuirá:

- id;
- nome;
- username;
- e-mail opcional;
- senha;
- perfil;
- status ativo/inativo;
- data de criação;
- data de atualização;
- último login.

A senha nunca poderá ser armazenada em texto puro.

Deverá ser armazenada somente como hash seguro.

Algoritmo recomendado:

```text
Argon2id
```

Alternativa aceitável:

```text
bcrypt
```

---

# 8. Fluxo de login

```text
Usuário abre o Balelagenda
↓
Informa username/e-mail
↓
Informa senha
↓
React envia os dados ao backend
↓
Backend encontra o usuário
↓
Backend verifica active = true
↓
Backend compara a senha com password_hash
↓
Backend cria uma sessão
↓
Sessão é enviada ao navegador
↓
Usuário entra no sistema
```

Se o usuário estiver inativo:

```text
Acesso bloqueado.
```

Mensagem sugerida:

```text
Este usuário está desativado. Entre em contato com um administrador.
```

---

# 9. Sessão

Preferencialmente utilizar sessão baseada em cookie:

```text
HttpOnly
Secure
SameSite
```

Evitar armazenar tokens sensíveis em `localStorage`.

A sessão poderá possuir:

- token aleatório;
- hash do token no banco;
- data de expiração;
- usuário associado;
- data de criação;
- data de revogação.

---

# 10. Tabela users

```sql
users
```

Campos sugeridos:

```text
id UUID PRIMARY KEY
name TEXT NOT NULL
username TEXT UNIQUE NOT NULL
email TEXT UNIQUE NULL
password_hash TEXT NOT NULL
role TEXT NOT NULL
active BOOLEAN NOT NULL DEFAULT TRUE
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
last_login_at TIMESTAMPTZ NULL
created_by UUID NULL
```

Roles iniciais:

```text
admin
user
```

---

# 11. Tabela user_sessions

```text
id UUID PRIMARY KEY
user_id UUID NOT NULL
token_hash TEXT NOT NULL
expires_at TIMESTAMPTZ NOT NULL
created_at TIMESTAMPTZ NOT NULL
revoked_at TIMESTAMPTZ NULL
ip_address TEXT NULL
user_agent TEXT NULL
```

Ao desativar um usuário:

```text
revogar todas as sessões dele
```

---

# 12. Primeiro administrador

Como não haverá cadastro público, o primeiro administrador deverá ser criado por:

- migration;
- seed;
- script administrativo;
- inserção inicial controlada.

Nunca deverá existir uma tela pública de:

```text
Criar conta
```

na primeira versão.

Os usuários serão criados pelo administrador.

---

# 13. Área administrativa

Se:

```text
user.role == "admin"
```

o sistema deverá disponibilizar uma área:

```text
Administração
```

Essa área deverá ficar invisível para usuários comuns.

Mais importante: os endpoints administrativos também deverão validar `role = admin` no backend.

Esconder o botão no React não é suficiente.

---

# 14. Gerenciamento de usuários pelo administrador

O administrador poderá:

- listar usuários;
- criar usuário;
- editar usuário;
- desativar usuário;
- reativar usuário;
- redefinir senha;
- consultar status;
- consultar data de criação;
- consultar último login;
- alterar role, quando permitido.

---

# 15. Tela de usuários

Exemplo:

```text
Administração > Usuários

João
@joao
Ativo
Admin

Pedro
@pedro
Ativo
Usuário

Lucas
@lucas
Inativo
Usuário
```

Ações:

```text
Editar
Redefinir senha
Desativar
Reativar
```

---

# 16. Criar usuário

Somente administrador.

Campos:

```text
Nome
Username
E-mail opcional
Senha inicial
Perfil
```

Fluxo:

```text
Admin
↓
Novo usuário
↓
Preenche formulário
↓
Backend valida
↓
Verifica duplicidade
↓
Gera hash
↓
Cria usuário
```

---

# 17. Desativar usuário

Na interface poderá existir:

```text
Desativar usuário
```

ou até uma ação visual chamada:

```text
Excluir
```

Porém, por padrão, o sistema deverá utilizar **soft delete**.

Ou seja:

```text
active = false
```

O registro não deverá ser removido fisicamente.

Isso evita quebrar:

- eventos criados;
- comentários;
- confirmações;
- votos;
- fotos;
- despesas;
- histórico.

---

# 18. Reativar usuário

Administrador poderá executar:

```text
active = true
```

Após isso o usuário poderá voltar a fazer login.

Opcionalmente o administrador poderá redefinir a senha antes da reativação.

---

# 19. Proteções administrativas

O sistema deverá impedir:

- usuário comum acessar endpoints administrativos;
- usuário inativo autenticar;
- usuário comum criar outros usuários;
- usuário comum desativar usuários;
- exposição de `password_hash`;
- exclusão física acidental;
- desativação do último administrador ativo;
- alteração de role sem autorização;
- uso da chave `service_role` no navegador.

---

# 20. Grupo

Mesmo que inicialmente exista apenas um grupo, recomenda-se preparar suporte a múltiplos grupos.

Tabela:

```text
groups
```

Campos:

```text
id UUID
name TEXT
description TEXT NULL
created_by UUID
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

---

# 21. Membros do grupo

Tabela:

```text
group_members
```

Campos:

```text
id UUID
group_id UUID
user_id UUID
role TEXT
joined_at TIMESTAMPTZ
active BOOLEAN
```

Roles possíveis dentro de um grupo:

```text
owner
admin
member
```

Esses roles do grupo são diferentes do `role` global do usuário.

---

# 22. Agenda compartilhada

A agenda será o núcleo do Balelagenda.

Visualizações:

- calendário mensal;
- lista;
- próximos eventos;
- eventos passados.

Cada evento deverá conter:

```text
id
group_id
title
description
start_at
end_at
location_name
created_by
created_at
updated_at
status
```

Status:

```text
planned
confirmed
cancelled
completed
```

---

# 23. Criar evento

Usuários ativos poderão criar eventos.

Campos:

- título;
- descrição;
- data;
- horário;
- local;
- observações;
- categoria;
- limite opcional de participantes.

O sistema deverá registrar automaticamente:

```text
created_by
created_at
```

---

# 24. Exemplo de evento

```text
Churrasco

Data:
26/09/2026

Horário:
19:00

Local:
Casa do Pedro

Descrição:
Cada um leva alguma coisa.

Criado por:
João
```

---

# 25. Editar evento

Usuários autorizados poderão editar.

Ao editar:

```text
updated_at
```

deverá ser atualizado.

Alterações importantes poderão ser registradas em histórico.

---

# 26. Histórico de alterações

Tabela:

```text
event_history
```

Campos:

```text
id UUID
event_id UUID
changed_by UUID
action TEXT
old_data JSONB
new_data JSONB
created_at TIMESTAMPTZ
```

Ações:

```text
created
edited
cancelled
restored
```

---

# 27. Confirmação de presença

Cada evento deverá permitir:

```text
Vou
Talvez
Não vou
```

Tabela:

```text
event_attendees
```

Campos:

```text
id UUID
event_id UUID
user_id UUID
status TEXT
updated_at TIMESTAMPTZ
```

Valores:

```text
going
maybe
not_going
```

Um usuário poderá possuir apenas uma resposta por evento.

---

# 28. Participantes

Exemplo:

```text
Confirmados: 5
Talvez: 2
Não vão: 1
```

Mostrar avatares ou nomes quando possível.

---

# 29. Comentários

Tabela:

```text
event_comments
```

Campos:

```text
id UUID
event_id UUID
user_id UUID
message TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Exemplos:

```text
"Quem vai de carro?"
"Vou chegar mais tarde."
"Levo bebida."
```

---

# 30. Ideias de rolê

Os usuários poderão cadastrar ideias sem precisar criar um evento imediatamente.

Exemplos:

```text
Kart
Boliche
Praia
Churrasco
Cinema
Paintball
Hamburgueria
Trilha
Escape Room
```

Tabela:

```text
outing_ideas
```

Campos:

```text
id UUID
group_id UUID
title TEXT
description TEXT
category TEXT
estimated_cost NUMERIC NULL
created_by UUID
active BOOLEAN
created_at TIMESTAMPTZ
```

---

# 31. Votação

Tabela:

```text
outing_votes
```

Campos:

```text
id UUID
outing_idea_id UUID
user_id UUID
created_at TIMESTAMPTZ
```

Regra:

```text
um voto por usuário por ideia
```

---

# 32. Rolê aleatório

Tela:

```text
Sem ideia do que fazer?

[ 🎲 Sortear rolê ]
```

O sistema selecionará aleatoriamente uma ideia ativa.

Exemplo:

```text
🎳 Boliche
```

---

# 33. Filtros do sorteio

Futuramente:

```text
Categoria
Orçamento
Horário
Ambiente
Quantidade de pessoas
```

Exemplo:

```text
até R$ 60
comida
noite
```

---

# 34. Evitar repetição

O sorteio poderá considerar o histórico e reduzir a chance de repetir rolês recentes.

Tabela:

```text
outing_history
```

Campos:

```text
id UUID
group_id UUID
outing_idea_id UUID
event_id UUID NULL
selected_at TIMESTAMPTZ
```

---

# 35. Criar evento a partir de ideia

Depois do sorteio:

```text
🎳 Boliche

[ Criar evento ]
[ Sortear novamente ]
```

Ao criar evento, o título e categoria poderão vir preenchidos automaticamente.

---

# 36. IA

A IA será opcional e complementar.

Ela não deverá ser necessária para o funcionamento principal.

Fluxo:

```text
Usuário
↓
Escreve o que procura
↓
Backend envia para IA
↓
IA transforma pedido em filtros estruturados
↓
API de lugares busca estabelecimentos reais
↓
Sistema retorna sugestões
```

---

# 37. Exemplo de IA

Entrada:

```text
Somos 5 pessoas, queremos sair sábado à noite,
comer alguma coisa e gastar até R$60 por pessoa.
```

Saída estruturada:

```json
{
  "category": "restaurant",
  "max_price": 60,
  "group_size": 5,
  "period": "night"
}
```

---

# 38. IA não deve inventar estabelecimentos

A IA não deverá ser a fonte de verdade sobre locais.

Fluxo correto:

```text
IA interpreta intenção
↓
API de lugares fornece locais reais
↓
Sistema apresenta resultados
```

---

# 39. API de lugares

Possíveis provedores:

- Google Places;
- Geoapify;
- Foursquare;
- serviços baseados em OpenStreetMap.

Criar camada abstrata:

```text
PlacesProvider
```

Assim o provedor poderá ser trocado futuramente.

---

# 40. Proteção de chaves externas

Nunca fazer:

```text
React → API privada com chave secreta
```

Fazer:

```text
React
↓
Edge Function
↓
API externa
```

Variáveis privadas:

```text
AI_API_KEY
PLACES_API_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Jamais expor no browser.

---

# 41. Memórias

Eventos concluídos poderão formar uma timeline de memórias.

Exemplo:

```text
Churrasco
20/09/2026

Participantes:
João
Pedro
Lucas

Fotos:
[foto] [foto] [foto]
```

---

# 42. Fotos

Armazenamento:

```text
Supabase Storage
```

Tabela:

```text
event_photos
```

Campos:

```text
id UUID
event_id UUID
uploaded_by UUID
storage_path TEXT
created_at TIMESTAMPTZ
```

---

# 43. Despesas

Funcionalidade futura.

Tabela:

```text
event_expenses
```

Campos:

```text
id UUID
event_id UUID
description TEXT
amount NUMERIC
paid_by UUID
created_at TIMESTAMPTZ
```

Participantes:

```text
expense_participants
```

---

# 44. Dashboard

Exemplo:

```text
Balelagenda

Olá, João 👋

Próximo rolê
Churrasco
Sábado às 19h

5 confirmados

[ Ver evento ]

Próximos eventos

[ 🎲 Sortear rolê ]
[ ✨ Pedir sugestão ]
```

Para admin:

```text
[ Administração ]
```

---

# 45. Navegação

Usuário comum:

```text
Início
Agenda
Ideias
Rolê Aleatório
Memórias
Grupo
Perfil
```

Administrador:

```text
Início
Agenda
Ideias
Rolê Aleatório
Memórias
Grupo
Perfil
Administração
```

---

# 46. Segurança sem Supabase Auth

Como não haverá Supabase Auth, não utilizar `auth.uid()` como base da segurança.

Cada requisição protegida deverá:

```text
receber sessão
↓
validar sessão
↓
carregar usuário
↓
verificar active
↓
verificar permissões
↓
executar operação
```

A autorização deverá acontecer no servidor.

---

# 47. Acesso ao banco

Recomendação:

O front-end não deverá receber a `service_role`.

Operações sensíveis deverão passar por Edge Functions ou API própria.

Exemplo:

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/me

GET  /api/events
POST /api/events

GET  /api/admin/users
POST /api/admin/users
PATCH /api/admin/users/:id
POST /api/admin/users/:id/deactivate
POST /api/admin/users/:id/activate
POST /api/admin/users/:id/reset-password
```

---

# 48. Estrutura do banco

Tabelas principais:

```text
users
user_sessions

groups
group_members

events
event_attendees
event_comments
event_history
event_photos

outing_ideas
outing_votes
outing_history

event_expenses
expense_participants

notifications
```

---

# 49. Notificações

Tabela:

```text
notifications
```

Campos:

```text
id UUID
user_id UUID
type TEXT
title TEXT
message TEXT
read BOOLEAN
created_at TIMESTAMPTZ
```

Exemplos:

```text
Pedro criou um evento.
Lucas alterou o horário.
João comentou no evento.
```

---

# 50. Estrutura React sugerida

```text
src/
  app/
    router.tsx
    providers.tsx

  components/
    ui/
    layout/

  features/
    auth/
    admin/
    users/
    groups/
    events/
    attendance/
    outingIdeas/
    randomOuting/
    memories/
    expenses/
    notifications/
    ai/
    places/

  lib/
    api.ts
    queryClient.ts

  pages/
  routes/
  types/
```

---

# 51. Camada de serviços

Evitar lógica de API diretamente nos componentes.

Exemplo:

```text
authService.ts
userService.ts
eventService.ts
outingService.ts
adminService.ts
```

Exemplo de funções:

```text
login()
logout()
getCurrentUser()

getUsers()
createUser()
deactivateUser()
activateUser()
resetUserPassword()

getEvents()
createEvent()
updateEvent()
```

---

# 52. TanStack Query

Utilizar para:

- cache;
- loading;
- mutations;
- invalidation;
- sincronização.

Hooks possíveis:

```text
useCurrentUser()
useEvents()
useCreateEvent()
useUsers()
useDeactivateUser()
```

---

# 53. Validação

Utilizar Zod.

Schemas:

```text
loginSchema
createUserSchema
editUserSchema
eventSchema
outingIdeaSchema
```

---

# 54. Formulários

Utilizar React Hook Form integrado ao Zod.

---

# 55. Interface

Estilo:

- moderno;
- casual;
- divertido;
- simples;
- mobile-first;
- com personalidade;
- sem aparência corporativa.

Elementos:

- cards;
- avatares;
- emojis;
- ícones;
- calendário;
- botões grandes;
- estados vazios amigáveis.

---

# 56. Responsividade

Suportar:

```text
smartphone
tablet
desktop
```

Prioridade:

```text
smartphone
```

---

# 57. PWA

Futuramente o Balelagenda poderá virar PWA.

Possibilidades:

- instalar no celular;
- ícone na tela inicial;
- notificações push;
- experiência semelhante a aplicativo.

---

# 58. MVP 1

Implementar primeiro:

```text
Autenticação própria
Administração de usuários
Criar usuário
Desativar usuário
Reativar usuário
Login
Logout
Grupo
Agenda
Criar evento
Editar evento
Cancelar evento
Confirmar presença
Ideias de rolê
Rolê aleatório
```

---

# 59. MVP 2

Adicionar:

```text
Comentários
Votação
Histórico de alterações
Memórias
Fotos
```

---

# 60. MVP 3

Adicionar:

```text
IA
Busca de lugares
Filtros inteligentes
Sugestões
```

---

# 61. MVP 4

Adicionar:

```text
Despesas
Notificações
Realtime
Estatísticas
Badges
PWA
```

---

# 62. Requisitos funcionais

## RF01

O sistema deve permitir login usando autenticação própria.

## RF02

O sistema não deve utilizar Supabase Auth.

## RF03

Somente usuários ativos podem realizar login.

## RF04

O sistema deve distinguir usuários `admin` e `user`.

## RF05

Administradores devem poder criar usuários.

## RF06

Administradores devem poder editar usuários.

## RF07

Administradores devem poder desativar usuários.

## RF08

Administradores devem poder reativar usuários.

## RF09

Administradores devem poder redefinir senhas.

## RF10

Usuários comuns não podem acessar ações administrativas.

## RF11

O sistema deve permitir criar eventos.

## RF12

O sistema deve permitir editar eventos.

## RF13

O sistema deve registrar o criador do evento.

## RF14

O sistema deve permitir confirmar presença.

## RF15

O sistema deve exibir participantes.

## RF16

O sistema deve permitir cadastrar ideias de rolê.

## RF17

O sistema deve permitir votar em ideias.

## RF18

O sistema deve permitir sortear ideias.

## RF19

O sistema deve manter histórico de rolês.

## RF20

O sistema deve permitir comentários.

## RF21

O sistema poderá armazenar fotos.

## RF22

O sistema poderá sugerir lugares utilizando IA e APIs externas.

---

# 63. Requisitos não funcionais

## RNF01

A aplicação deve utilizar TypeScript.

## RNF02

A aplicação deve ser responsiva.

## RNF03

A aplicação deve utilizar HTTPS em produção.

## RNF04

Senhas nunca podem ser armazenadas em texto puro.

## RNF05

Hashes de senha nunca devem ser retornados ao cliente.

## RNF06

Autorização deve ser validada no backend.

## RNF07

Chaves privadas não podem ser expostas no front-end.

## RNF08

Usuários desativados devem ter sessões revogadas.

## RNF09

Operações administrativas devem exigir `role = admin`.

## RNF10

O código deve ser organizado por funcionalidades.

---

# 64. Regras de usuário

- `username` deve ser único;
- `email`, quando informado, deve ser único;
- `password_hash` é obrigatório;
- `active` deve iniciar como `true`;
- novos usuários só podem ser criados por admin;
- usuários inativos não autenticam;
- usuário desativado permanece no banco;
- histórico associado ao usuário deve ser preservado.

---

# 65. Seed inicial

Criar um comando ou migration para gerar o primeiro admin.

Exemplo conceitual:

```text
username: admin
role: admin
active: true
password_hash: <hash>
```

A senha real não deve ficar hardcoded no repositório.

---

# 66. Auditoria administrativa

Recomendação:

Criar tabela:

```text
admin_audit_log
```

Campos:

```text
id UUID
admin_user_id UUID
target_user_id UUID NULL
action TEXT
metadata JSONB
created_at TIMESTAMPTZ
```

Exemplos de ação:

```text
USER_CREATED
USER_UPDATED
USER_DEACTIVATED
USER_ACTIVATED
PASSWORD_RESET
ROLE_CHANGED
```

---

# 67. Soft delete

Sempre que possível utilizar:

```text
active
deleted_at
status
```

em vez de apagar registros permanentemente.

---

# 68. Datas

Utilizar:

```text
TIMESTAMPTZ
```

e converter para horário local no cliente.

---

# 69. Estados vazios

Exemplo:

```text
Nenhum evento marcado ainda.

Que tal criar o primeiro?
```

Admin:

```text
Nenhum usuário cadastrado.
```

---

# 70. Feedback visual

Utilizar toasts:

```text
Evento criado.
Usuário criado.
Usuário desativado.
Usuário reativado.
Senha redefinida.
Presença confirmada.
```

---

# 71. Erros

Exemplos:

```text
Usuário ou senha inválidos.
Usuário desativado.
Você não possui permissão para realizar esta ação.
Este username já está em uso.
Não foi possível criar o evento.
```

Evitar mensagens que revelem detalhes sensíveis.

---

# 72. Estratégia de implementação com Codex

Não solicitar a implementação inteira de uma vez.

Sequência recomendada:

```text
1. Criar estrutura React + TypeScript
2. Configurar Supabase Database
3. Criar migrations
4. Criar tabela users
5. Criar tabela user_sessions
6. Criar seed do primeiro admin
7. Criar backend/Edge Functions de autenticação
8. Implementar login/logout
9. Implementar middleware de sessão
10. Implementar autorização admin
11. Implementar tela administrativa
12. Criar/desativar/reativar usuários
13. Implementar grupos
14. Implementar agenda
15. Implementar eventos
16. Implementar presença
17. Implementar ideias
18. Implementar sorteio
19. Implementar comentários
20. Implementar memórias
21. Implementar IA
22. Implementar busca de lugares
```

---

# 73. Uso com GitHub Spec Kit

Recomenda-se dividir em specs independentes.

```text
spec-01-project-foundation
spec-02-custom-authentication
spec-03-admin-user-management
spec-04-groups
spec-05-calendar-events
spec-06-attendance
spec-07-outing-ideas
spec-08-random-outing
spec-09-comments
spec-10-memories
spec-11-ai-place-suggestions
```

---

# 74. Spec de autenticação

Objetivo:

```text
Login próprio sem Supabase Auth
Sessão segura
Logout
Usuário ativo/inativo
Middleware de autenticação
```

Critérios:

```text
senha incorreta não autentica
usuário inativo não autentica
sessão inválida não acessa rotas protegidas
logout invalida sessão
```

---

# 75. Spec de administração

Objetivo:

```text
Admin gerencia usuários
```

Funcionalidades:

```text
listar
criar
editar
desativar
reativar
redefinir senha
```

Critérios:

```text
user comum recebe 403
admin consegue criar usuário
username duplicado falha
desativar revoga sessões
reativar libera novo login
último admin não pode ser desativado
```

---

# 76. Spec de agenda

Objetivo:

```text
Criar e visualizar eventos compartilhados.
```

Critérios:

```text
evento registra criador
evento aparece para o grupo
edição atualiza updated_at
cancelamento preserva histórico
```

---

# 77. Spec de participação

Objetivo:

```text
Vou
Talvez
Não vou
```

Um usuário possui somente uma resposta por evento.

---

# 78. Spec de ideias

Objetivo:

```text
Criar ideia
Listar
Votar
Desativar
```

---

# 79. Spec de rolê aleatório

Objetivo:

```text
Sortear entre ideias ativas
Aplicar filtros futuramente
Evitar repetição
Criar evento a partir do resultado
```

---

# 80. Critérios gerais de aceite

Uma feature somente será considerada pronta quando:

- funcionar em mobile;
- funcionar em desktop;
- possuir loading;
- possuir tratamento de erro;
- possuir validação;
- validar autorização no backend;
- não expor segredos;
- apresentar feedback visual;
- preservar integridade dos dados.

---

# 81. Resumo da arquitetura de autenticação

```text
React
↓
POST /auth/login
↓
Backend
↓
users
↓
Argon2id/bcrypt
↓
user_sessions
↓
cookie HttpOnly
```

Toda rota protegida:

```text
cookie
↓
validar sessão
↓
buscar usuário
↓
active == true?
↓
validar role/permissão
↓
executar operação
```

---

# 82. Resumo final

O **Balelagenda** será uma agenda social privada para amigos.

Núcleo:

```text
Agenda compartilhada
+
Confirmação de presença
+
Ideias de rolê
+
Rolê aleatório
```

Administração:

```text
Autenticação própria
+
Admin cria usuários
+
Admin desativa usuários
+
Admin reativa usuários
+
Admin redefine senhas
```

Evolução:

```text
Comentários
+
Memórias
+
Fotos
+
IA
+
Busca de lugares
+
Despesas
+
Notificações
```

A aplicação utilizará React e Supabase, mas **sem Supabase Auth**. O Supabase será utilizado principalmente como PostgreSQL, Storage e plataforma para funções server-side.

A lógica de autenticação, sessão e autorização será controlada pela própria aplicação, com senhas armazenadas somente como hash seguro e operações administrativas protegidas no backend.
