-- updated_at triggers and the empty brief created with every project (T1.1, AC7.1).

create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger intakes_updated_at before update on public.intakes
  for each row execute function public.set_updated_at();
create trigger project_ratings_updated_at before update on public.project_ratings
  for each row execute function public.set_updated_at();

-- Every project starts with an empty brief, in the same transaction.
create or replace function public.project_create_intake() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.intakes (project_id, workspace_id) values (new.id, new.workspace_id);
  return new;
end $$;
revoke all on function public.project_create_intake() from public, anon, authenticated;

create trigger projects_create_intake after insert on public.projects
  for each row execute function public.project_create_intake();

-- Workspace and creator never change after creation.
create or replace function public.project_lock_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.workspace_id <> old.workspace_id or new.created_by <> old.created_by then
    raise exception 'project_identity_locked' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger projects_lock_identity before update on public.projects
  for each row execute function public.project_lock_identity();
