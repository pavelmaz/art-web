-- "Visual description" insights, generated once per artwork + language by the
-- artwork-insights edge function and served from here afterwards (28 Sep 2026).
-- Only the edge function (service role) reads or writes it.
--
-- Applied to prod 28 Sep 2026 via the Supabase MCP (migration `artwork_insights_cache`).
create table if not exists public.artwork_insights (
  artwork_id text not null,
  locale text not null,
  insights jsonb not null,
  model text not null,
  created_at timestamptz not null default now(),
  primary key (artwork_id, locale)
);

create index if not exists artwork_insights_created_at_idx on public.artwork_insights (created_at);

alter table public.artwork_insights enable row level security;
