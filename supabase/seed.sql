-- Development seed (04 §4). Never used in production.
update private.app_config set bootstrap_admin_email = 'admin@fluently.test';

insert into public.workspaces (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Fluently Dev');

insert into public.allowlist_entries (workspace_id, value, kind)
values ('00000000-0000-4000-8000-000000000001', '@fluently.test', 'domain');

-- Seeded accounts (password: password-dev-123). Inserting into auth.users fires the member trigger.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000a1', 'authenticated',
   'authenticated', 'admin@fluently.test', crypt('password-dev-123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000b1', 'authenticated',
   'authenticated', 'member@fluently.test', crypt('password-dev-123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u where u.email in ('admin@fluently.test', 'member@fluently.test');

update public.members set role = 'admin', display_name = 'Dev Admin' where email = 'admin@fluently.test';
update public.members set display_name = 'Dev Member' where email = 'member@fluently.test';
