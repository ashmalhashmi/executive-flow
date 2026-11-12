-- AI usage receipts. Service role only — no anon/authenticated policies.
-- Safe to re-run. Does not store prompts, responses, photos, contacts, or keys.

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  feature text not null,
  model text not null default '',
  status text not null check (status in ('success', 'failed')),
  input_tokens integer,
  cached_input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(14, 8),
  tokens_known boolean not null default false,
  error_kind text,
  user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_occurred_at_idx
  on public.ai_usage_events (occurred_at desc);

create index if not exists ai_usage_events_feature_idx
  on public.ai_usage_events (feature);

alter table public.ai_usage_events enable row level security;

revoke all on table public.ai_usage_events from anon, authenticated;
grant all on table public.ai_usage_events to service_role;

create table if not exists public.ai_usage_spend_snapshots (
  id text primary key,
  reported_usd numeric(14, 6),
  period_start timestamptz,
  period_end timestamptz,
  synced_at timestamptz not null default now(),
  source text not null default 'openai_organization_costs'
);

alter table public.ai_usage_spend_snapshots enable row level security;

revoke all on table public.ai_usage_spend_snapshots from anon, authenticated;
grant all on table public.ai_usage_spend_snapshots to service_role;
