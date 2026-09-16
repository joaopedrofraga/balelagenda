-- Seed: grupo padrão + instruções do primeiro admin
-- 1) Crie o usuário no Dashboard (Authentication → Users → Add user)
-- 2) Substitua os UUIDs abaixo e execute este script

insert into public.groups (id, name, description)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Balela',
  'Grupo padrão do Balelagenda'
)
on conflict (id) do nothing;

-- === BOOTSTRAP ADMIN (edite e rode após criar o user no Auth) ===
-- replace 'SEU-USER-UUID' pelo id de auth.users
/*
insert into public.profiles (id, name, username, email, role, active)
values (
  'SEU-USER-UUID',
  'Administrador',
  'admin',
  'admin@example.com',
  'admin',
  true
)
on conflict (id) do update
  set role = 'admin', active = true;

insert into public.group_members (group_id, user_id, role, active)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'SEU-USER-UUID',
  'owner',
  true
)
on conflict (group_id, user_id) do update set active = true, role = 'owner';
*/
