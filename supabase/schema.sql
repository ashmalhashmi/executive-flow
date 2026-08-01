-- Executive Flow — Supabase cloud sync
-- Run in Supabase Dashboard → SQL Editor → New query

create table if not exists public.user_app_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_app_data enable row level security;

create policy "Users read own app data"
  on public.user_app_data for select
  using (auth.uid() = user_id);

create policy "Users insert own app data"
  on public.user_app_data for insert
  with check (auth.uid() = user_id);

create policy "Users update own app data"
  on public.user_app_data for update
  using (auth.uid() = user_id);

-- Optional: index for admin queries
create index if not exists user_app_data_updated_at_idx
  on public.user_app_data (updated_at desc);

-- Real-time Pulse: enable Postgres Changes for instant multi-device updates
-- Run once. If already added, ignore duplicate error.
-- Dashboard → Database → Replication can also toggle this.
do $$
begin
  alter publication supabase_realtime add table public.user_app_data;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
