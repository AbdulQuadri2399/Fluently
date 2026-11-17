-- Slice 7: AI budget (AC27.4, O31) and the research activity log in realtime (AC11.10).

-- O31 raiseProjectCap: admins only. A run paused at the cap goes back in the queue; returns its id.
create or replace function public.raise_project_cap(p_project uuid, p_cap numeric) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  ws uuid;
  paused uuid;
begin
  select workspace_id into ws from public.projects where id = p_project;
  if ws is null or not public.is_admin(ws) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_cap is null or p_cap <= 0 or p_cap > 1000 then
    raise exception 'invalid_cap' using errcode = '22023';
  end if;
  update public.projects set cost_cap_override_gbp = p_cap, updated_by = me where id = p_project;
  update public.stage_runs set status = 'queued'
    where project_id = p_project and status = 'paused_cost'
    returning id into paused;
  if paused is not null then
    update public.projects set status = 'running', updated_by = me where id = p_project;
  end if;
  return paused;
end $$;

-- O31 confirmOverCap: any member lets this paused run carry on past the budget (recorded).
create or replace function public.confirm_over_cap(p_run uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  r public.stage_runs%rowtype;
begin
  select * into r from public.stage_runs where id = p_run for update;
  if r.id is null or not public.is_member(r.workspace_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if r.status <> 'paused_cost' then
    raise exception 'not_paused' using errcode = 'P0003';
  end if;
  update public.stage_runs
    set status = 'queued', over_cap_confirmed_by = me, over_cap_confirmed_at = now()
    where id = p_run;
  update public.projects set status = 'running', updated_by = me where id = r.project_id;
  return p_run;
end $$;

revoke all on function public.raise_project_cap(uuid, numeric) from public, anon;
revoke all on function public.confirm_over_cap(uuid) from public, anon;
grant execute on function public.raise_project_cap(uuid, numeric) to authenticated;
grant execute on function public.confirm_over_cap(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.run_events;
  end if;
end $$;
