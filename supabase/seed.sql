-- Seed: grupo padrão + primeiro admin (auth custom — sem Dashboard Auth Users)
--
-- Senha padrão do admin: Admin@ChangeMe1!
-- Hash bcrypt (cost 10) gerado com bcryptjs — TROQUE a senha após o primeiro login.
--
-- Para gerar outro hash (Node, na pasta web/):
--   npx --yes bcryptjs-cli hash "SuaSenhaSegura"
-- Ou no Deno:
--   deno eval "import bcrypt from 'npm:bcryptjs'; console.log(bcrypt.hashSync('SuaSenha', 10))"

insert into public.groups (id, name, description)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Balela',
  'Grupo padrão do Balelagenda'
)
on conflict (id) do nothing;

-- Bootstrap admin (id fixo para facilitar docs / membership)
insert into public.profiles (
  id, name, username, email, password_hash, role, active
)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Administrador',
  'admin',
  'admin@example.com',
  '$2b$10$OlNLjXb/LuTtyNDwDgnc..sNQaFpOp3aQPLRJxvjw1q9EnuWddkxi',
  'admin',
  true
)
on conflict (id) do update
  set role = 'admin',
      active = true,
      password_hash = excluded.password_hash,
      name = excluded.name,
      username = excluded.username,
      email = excluded.email;

insert into public.group_members (group_id, user_id, role, active)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'owner',
  true
)
on conflict (group_id, user_id) do update
  set active = true, role = 'owner';
