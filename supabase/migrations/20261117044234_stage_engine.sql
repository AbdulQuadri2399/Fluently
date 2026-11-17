-- O18 startStage / O19 cancelStage (AC11.1, AC11.3, AC11.7) and live updates for the tree (D5).

create or replace function public.start_stage(p_project uuid, p_stage text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  p public.projects%rowtype;
  ws public.workspaces%rowtype;
  gate text;
  run uuid;
  steps jsonb;
begin
  select * into p from public.projects where id = p_project for update;
  if p.id is null or not public.is_member(p.workspace_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if exists (select 1 from public.stage_runs r where r.project_id = p_project and r.status in ('queued', 'running')) then
    raise exception 'already_running' using errcode = 'P0004';
  end if;
  if p_stage <> 'research' then
    raise exception 'unsupported_stage' using errcode = '22023';
  end if;
  -- Research needs an approved brief and a passed (or overridden) ethics check (AC10.2, AC10.3).
  select n.status into gate from public.nodes n
    where n.project_id = p_project and n.type = 'ethics' and n.deleted_at is null limit 1;
  if gate is null or gate not in ('ok', 'overridden') or p.current_stage <> 'research' then
    raise exception 'not_ready' using errcode = '22023';
  end if;
  -- AC4.9: needs a toolkit. A project made before the first upload takes the current default.
  if p.toolkit_version_id is null then
    select * into ws from public.workspaces where id = p.workspace_id;
    if ws.default_toolkit_version_id is null then
      raise exception 'no_toolkit' using errcode = 'P0005';
    end if;
    update public.projects set toolkit_version_id = ws.default_toolkit_version_id where id = p_project;
  end if;

  steps := '[{"key":"client_data","status":"waiting"},{"key":"papers","status":"waiting"},{"key":"web","status":"waiting"},{"key":"competitors","status":"waiting"},{"key":"reviews","status":"waiting"}]'::jsonb;
  insert into public.stage_runs (workspace_id, project_id, stage, status, steps, started_by)
  values (p.workspace_id, p_project, p_stage, 'queued', steps, me) returning id into run;
  update public.projects set status = 'running', updated_by = me where id = p_project;
  return run;
end $$;

create or replace function public.cancel_stage(p_run uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  r public.stage_runs%rowtype;
begin
  select * into r from public.stage_runs where id = p_run for update;
  if r.id is null or not public.is_member(r.workspace_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if r.status not in ('queued', 'running') then
    raise exception 'not_running' using errcode = 'P0003';
  end if;
  update public.stage_runs set status = 'cancelled', finished_at = now() where id = p_run;
  update public.projects set status = 'waiting', updated_by = me where id = r.project_id;
end $$;

revoke all on function public.start_stage(uuid, text) from public, anon;
revoke all on function public.cancel_stage(uuid) from public, anon;
grant execute on function public.start_stage(uuid, text) to authenticated;
grant execute on function public.cancel_stage(uuid) to authenticated;

-- Realtime: members receive changes to the tree (RLS still applies to what they see).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.nodes, public.edges, public.stage_runs;
  end if;
end $$;
