-- Office record of OpenAI API prepaid top-ups (date + USD). Anon stays revoked.

create table if not exists public.ai_usage_wallet_fills (
  id uuid primary key default gen_random_uuid(),
  filled_at timestamptz not null,
  amount_usd numeric(14, 4) not null check (amount_usd > 0),
  amount_pkr numeric(14, 2),
  note text,
  source text not null default 'manual',
  user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_wallet_fills_filled_at_idx
  on public.ai_usage_wallet_fills (filled_at desc);

alter table public.ai_usage_wallet_fills enable row level security;

revoke all on table public.ai_usage_wallet_fills from anon;
grant select, insert, delete on table public.ai_usage_wallet_fills to authenticated;
grant all on table public.ai_usage_wallet_fills to service_role;

drop policy if exists ai_usage_wallet_fills_select_authenticated on public.ai_usage_wallet_fills;
drop policy if exists ai_usage_wallet_fills_insert_authenticated on public.ai_usage_wallet_fills;
drop policy if exists ai_usage_wallet_fills_delete_authenticated on public.ai_usage_wallet_fills;

create policy ai_usage_wallet_fills_select_authenticated
  on public.ai_usage_wallet_fills
  for select
  to authenticated
  using (true);

create policy ai_usage_wallet_fills_insert_authenticated
  on public.ai_usage_wallet_fills
  for insert
  to authenticated
  with check (true);

create policy ai_usage_wallet_fills_delete_authenticated
  on public.ai_usage_wallet_fills
  for delete
  to authenticated
  using (true);
