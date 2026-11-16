-- updated_at triggers, column grants, and the allowlist triggers on auth.users (D13, AC1.1, AC1.2, AC1.7).

create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();
create trigger members_updated_at before update on public.members
  for each row execute function public.set_updated_at();
create trigger allowlist_entries_updated_at before update on public.allowlist_entries
  for each row execute function public.set_updated_at();
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- Members may only change their own display name and onboarding flag. Role/active change via admin functions.
revoke update on public.members from anon, authenticated;
grant update (display_name, onboarded_at) on public.members to authenticated;

-- Refuse sign-ups from emails that aren't allowlisted (defence in depth behind the sign-up action).
create or replace function public.auth_user_allowlist_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_email_allowed(new.email) then
    raise exception 'email_not_allowed' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- Create the member row. The bootstrap admin creates the workspace when none exists.
create or replace function public.auth_user_create_member() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  ws uuid := public.allowed_workspace_for(new.email);
  is_bootstrap boolean := lower(new.email) =
    (select lower(c.bootstrap_admin_email) from private.app_config c);
  member_role text := 'member';
begin
  if ws is null and is_bootstrap then
    select w.id into ws from public.workspaces w order by w.created_at limit 1;
    if ws is null then
      insert into public.workspaces (name) values ('Fluently') returning id into ws;
      member_role := 'admin';
    end if;
  end if;
  if ws is null then
    raise exception 'email_not_allowed' using errcode = 'P0001';
  end if;
  insert into public.members (id, workspace_id, email, role)
  values (new.id, ws, new.email, member_role);
  return new;
end $$;

revoke all on function public.auth_user_allowlist_guard() from public, anon, authenticated;
revoke all on function public.auth_user_create_member() from public, anon, authenticated;

create trigger auth_users_allowlist before insert on auth.users
  for each row execute function public.auth_user_allowlist_guard();
create trigger auth_users_create_member after insert on auth.users
  for each row execute function public.auth_user_create_member();
