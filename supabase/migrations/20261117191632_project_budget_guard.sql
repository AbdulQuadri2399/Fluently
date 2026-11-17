-- AC7.9, AC27.4: only admins change a project's AI budget. Other project fields stay editable by
-- members (projects_update). Jobs and checked functions (raise_project_cap, as an admin) pass.
create or replace function public.guard_project_budget() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.cost_cap_override_gbp is distinct from old.cost_cap_override_gbp
     and auth.uid() is not null
     and not public.is_admin(new.workspace_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists projects_budget_guard on public.projects;
create trigger projects_budget_guard before update on public.projects
  for each row execute function public.guard_project_budget();
