-- Helper functions used by RLS policies and auth triggers (04 §4).
-- plpgsql bodies resolve table names at call time, so these can precede the tables.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Single-row app configuration, not reachable through the API.
create table if not exists private.app_config (
  id boolean primary key default true check (id),
  bootstrap_admin_email text
);
insert into private.app_config (id) values (true) on conflict do nothing;

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.is_member(ws uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  return exists (
    select 1 from public.members m
    where m.id = auth.uid() and m.workspace_id = ws and m.active
  );
end $$;

create or replace function public.is_admin(ws uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  return exists (
    select 1 from public.members m
    where m.id = auth.uid() and m.workspace_id = ws and m.active and m.role = 'admin'
  );
end $$;

-- Returns the workspace an email may join, or null. Bootstrap admin may always sign up.
create or replace function public.allowed_workspace_for(email text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  e text := lower(trim(email));
  ws uuid;
begin
  select a.workspace_id into ws from public.allowlist_entries a
  where (a.kind = 'email' and lower(a.value) = e)
     or (a.kind = 'domain' and e like '%' || lower(a.value))
  order by (a.kind = 'email') desc
  limit 1;
  return ws;
end $$;

create or replace function public.is_email_allowed(email text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  return public.allowed_workspace_for(email) is not null
      or lower(trim(email)) = (select lower(c.bootstrap_admin_email) from private.app_config c);
end $$;

revoke all on function public.allowed_workspace_for(text) from public, anon, authenticated;
grant execute on function public.is_email_allowed(text) to anon, authenticated, service_role;
