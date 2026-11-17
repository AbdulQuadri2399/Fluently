-- AC10.5: after a failed ethics check, a member can run it again. Never treats failure as a pass.
create or replace function public.retry_ethics(p_project uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  p public.projects%rowtype;
  last_status text;
  run uuid;
begin
  select * into p from public.projects where id = p_project for update;
  if p.id is null or not public.is_member(p.workspace_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select r.status into last_status from public.stage_runs r
    where r.project_id = p_project and r.stage = 'ethics' order by r.created_at desc limit 1;
  if last_status is distinct from 'failed' then
    raise exception 'not_failed' using errcode = 'P0003';
  end if;
  insert into public.stage_runs (workspace_id, project_id, stage, status, started_by)
  values (p.workspace_id, p_project, 'ethics', 'queued', me) returning id into run;
  update public.projects set status = 'running', updated_by = me where id = p_project;
  return run;
end $$;

revoke all on function public.retry_ethics(uuid) from public, anon;
grant execute on function public.retry_ethics(uuid) to authenticated;
