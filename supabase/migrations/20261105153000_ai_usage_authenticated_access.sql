-- Preview/server can record and read receipts with the signed-in user's JWT
-- when SUPABASE_SERVICE_ROLE_KEY is not set. Anon stays revoked.

grant select, insert on table public.ai_usage_events to authenticated;

drop policy if exists ai_usage_events_select_authenticated on public.ai_usage_events;
drop policy if exists ai_usage_events_insert_authenticated on public.ai_usage_events;

create policy ai_usage_events_select_authenticated
  on public.ai_usage_events
  for select
  to authenticated
  using (true);

create policy ai_usage_events_insert_authenticated
  on public.ai_usage_events
  for insert
  to authenticated
  with check (true);

grant select, insert, update on table public.ai_usage_spend_snapshots to authenticated;

drop policy if exists ai_usage_spend_snapshots_select_authenticated on public.ai_usage_spend_snapshots;
drop policy if exists ai_usage_spend_snapshots_insert_authenticated on public.ai_usage_spend_snapshots;
drop policy if exists ai_usage_spend_snapshots_update_authenticated on public.ai_usage_spend_snapshots;

create policy ai_usage_spend_snapshots_select_authenticated
  on public.ai_usage_spend_snapshots
  for select
  to authenticated
  using (true);

create policy ai_usage_spend_snapshots_insert_authenticated
  on public.ai_usage_spend_snapshots
  for insert
  to authenticated
  with check (true);

create policy ai_usage_spend_snapshots_update_authenticated
  on public.ai_usage_spend_snapshots
  for update
  to authenticated
  using (true)
  with check (true);
