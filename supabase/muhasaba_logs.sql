-- Optional dedicated table (app currently persists via localStorage + cloud snapshot).
-- Run in Supabase SQL editor if you want a relational store later.

create table if not exists public.muhasaba_logs (
  id uuid primary key default gen_random_uuid(),
  deed_text text not null,
  classification text not null check (classification in ('good', 'bad')),
  evaluation text,
  divine_reference text,
  identity_statement text,
  immediate_action text,
  is_action_completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists muhasaba_logs_created_at_idx
  on public.muhasaba_logs (created_at desc);

alter table public.muhasaba_logs enable row level security;
