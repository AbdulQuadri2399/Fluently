-- Admin changes to members (O6, AC3.4, AC3.5). Members can't update role or active directly
-- (column grants in auth_triggers), so these checked functions are the only way in.
-- Errors: 42501 = not an admin of that workspace (forbidden), P0002 = no such member
-- (not_found), P0003 = would leave the workspace without an active admin (conflict).

create trigger ai_usage_updated_at before update on public.ai_usage
  for each row execute function public.set_updated_at();

create or replace function private.assert_admin_change(target uuid, new_role text, new_active boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  ws uuid;
  other_admins int;
begin
  select m.workspace_id into ws from public.members m where m.id = target;
  if ws is null then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;
  if not public.is_admin(ws) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- Lock the workspace's admins so two admins can't demote each other at the same time.
  perform 1 from public.members m where m.workspace_id = ws and m.role = 'admin' for update;
  if new_role <> 'admin' or not new_active then
    select count(*) into other_admins from public.members m
      where m.workspace_id = ws and m.role = 'admin' and m.active and m.id <> target;
    if other_admins = 0 then
      raise exception 'last_admin' using errcode = 'P0003';
    end if;
  end if;
end $$;

create or replace function public.set_member_role(member_id uuid, new_role text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  is_active boolean;
begin
  if new_role not in ('admin', 'member') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;
  select m.active into is_active from public.members m where m.id = member_id;
  perform private.assert_admin_change(member_id, new_role, coalesce(is_active, false));
  update public.members set role = new_role where id = member_id;
end $$;

create or replace function public.set_member_active(member_id uuid, is_active boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  current_role_ text;
begin
  select m.role into current_role_ from public.members m where m.id = member_id;
  perform private.assert_admin_change(member_id, coalesce(current_role_, 'member'), is_active);
  update public.members set active = is_active where id = member_id;
  -- Block sign-in and end every session (refresh tokens) at once; data access already
  -- stops because is_member() checks active (AC3.4).
  update auth.users set banned_until = case when is_active then null else 'infinity'::timestamptz end
    where id = member_id;
  if not is_active then
    delete from auth.sessions where user_id = member_id;
  end if;
end $$;

revoke all on function private.assert_admin_change(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.set_member_role(uuid, text) from public, anon;
revoke all on function public.set_member_active(uuid, boolean) from public, anon;
grant execute on function public.set_member_role(uuid, text) to authenticated;
grant execute on function public.set_member_active(uuid, boolean) to authenticated;
