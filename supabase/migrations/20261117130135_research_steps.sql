-- Research gains a toolkit step (AC12.1: candidate principles from the pinned toolkit).
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

  steps := '[{"key":"toolkit","status":"waiting"},{"key":"client_data","status":"waiting"},{"key":"papers","status":"waiting"},{"key":"web","status":"waiting"},{"key":"competitors","status":"waiting"},{"key":"reviews","status":"waiting"},{"key":"findings","status":"waiting"},{"key":"synthesis","status":"waiting"}]'::jsonb;
  insert into public.stage_runs (workspace_id, project_id, stage, status, steps, started_by)
  values (p.workspace_id, p_project, p_stage, 'queued', steps, me) returning id into run;
  update public.projects set status = 'running', updated_by = me where id = p_project;
  return run;
end $$;


-- AC11.5, AC11.6: a retry run points at the run it continues, so it can reuse that run's sources.
alter table public.stage_runs add column retry_of uuid references public.stage_runs(id) on delete set null;

-- Retry failed steps (AC11.5) or synthesis only (AC11.6): a new run that keeps what already worked.
create or replace function public.retry_research(p_run uuid, p_synthesis_only boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  r public.stage_runs%rowtype;
  steps jsonb;
  run uuid;
begin
  select * into r from public.stage_runs where id = p_run;
  if r.id is null or not public.is_member(r.workspace_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if r.stage <> 'research' or r.status not in ('failed', 'partial') then
    raise exception 'not_retryable' using errcode = 'P0003';
  end if;
  if exists (select 1 from public.stage_runs x where x.project_id = r.project_id and x.status in ('queued', 'running')) then
    raise exception 'already_running' using errcode = 'P0004';
  end if;
  select jsonb_agg(
    case
      when s ->> 'key' in ('findings', 'synthesis') and not p_synthesis_only then jsonb_set(s, '{status}', '"waiting"')
      when s ->> 'key' = 'synthesis' then jsonb_set(s, '{status}', '"waiting"')
      when s ->> 'status' = 'failed' and not p_synthesis_only then jsonb_set(s, '{status}', '"waiting"')
      else s
    end order by ord)
  into steps
  from jsonb_array_elements(r.steps) with ordinality as e(s, ord);
  insert into public.stage_runs (workspace_id, project_id, stage, status, steps, started_by, retry_of)
  values (r.workspace_id, r.project_id, 'research', 'queued', steps, me, r.id) returning id into run;
  update public.projects set status = 'running', updated_by = me where id = r.project_id;
  return run;
end $$;

revoke all on function public.retry_research(uuid, boolean) from public, anon;
grant execute on function public.retry_research(uuid, boolean) to authenticated;
