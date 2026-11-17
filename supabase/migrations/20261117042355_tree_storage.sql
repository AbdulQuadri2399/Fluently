-- Slice 4 support: updated_at triggers, node history, and the private uploads bucket.

create trigger uploads_updated_at before update on public.uploads
  for each row execute function public.set_updated_at();
create trigger stage_runs_updated_at before update on public.stage_runs
  for each row execute function public.set_updated_at();
create trigger nodes_updated_at before update on public.nodes
  for each row execute function public.set_updated_at();
create trigger edges_updated_at before update on public.edges
  for each row execute function public.set_updated_at();
create trigger node_history_updated_at before update on public.node_history
  for each row execute function public.set_updated_at();
create trigger checkpoints_updated_at before update on public.checkpoints
  for each row execute function public.set_updated_at();
create trigger ethics_overrides_updated_at before update on public.ethics_overrides
  for each row execute function public.set_updated_at();

-- Every create and edit of a card leaves a snapshot (AC24.x history). Members can't write
-- node_history directly; this trigger can.
create or replace function private.record_node_history() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  what text;
begin
  if tg_op = 'INSERT' then
    what := 'created';
  elsif new.deleted_at is not null and old.deleted_at is null then
    what := 'deleted';
  elsif new.deleted_at is null and old.deleted_at is not null then
    what := 'restored';
  elsif new.title is distinct from old.title or new.data is distinct from old.data then
    what := 'edited';
  else
    return new;
  end if;
  insert into public.node_history (workspace_id, node_id, snapshot, change, changed_by)
  values (new.workspace_id, new.id,
          jsonb_build_object('title', new.title, 'data', new.data, 'status', new.status, 'provenance', new.provenance),
          what, auth.uid());
  return new;
end $$;

create trigger nodes_history after insert or update on public.nodes
  for each row execute function private.record_node_history();

-- Private bucket for brief uploads (AC8.6–AC8.8). Paths are "<workspace_id>/<project_id>/<file>".
insert into storage.buckets (id, name, public, file_size_limit)
values ('uploads', 'uploads', false, 20971520)
on conflict (id) do nothing;

create or replace function public.can_access_upload(object_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  folder text := split_part(object_name, '/', 1);
begin
  if folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.is_member(folder::uuid);
end $$;

grant execute on function public.can_access_upload(text) to authenticated;

create policy "uploads_objects_select" on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and public.can_access_upload(name));
create policy "uploads_objects_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and public.can_access_upload(name));
create policy "uploads_objects_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and public.can_access_upload(name));
