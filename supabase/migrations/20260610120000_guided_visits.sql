-- Museum visit guide generator: shareable guides with optional user ownership.

create table if not exists public.guided_visits (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique default substr(md5(random()::text), 1, 8),
  museum_slug text not null,
  museum_name text not null,
  user_id     uuid references auth.users (id) on delete set null,
  visit_type  text not null check (visit_type in ('masterpieces', 'overview', 'in_depth')),
  time_hours  numeric not null,
  focus       text,
  locale      text not null default 'en',
  guide_data  jsonb not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz default now() + interval '30 days'
);

comment on table public.guided_visits is 'AI-generated museum visit guides; shareable via token URL.';

alter table public.guided_visits enable row level security;

create policy "guided_visits_select_own"
  on public.guided_visits
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "guided_visits_select_by_token"
  on public.guided_visits
  for select
  to anon
  using (true);

create policy "guided_visits_insert"
  on public.guided_visits
  for insert
  to anon, authenticated
  with check (true);

create policy "guided_visits_update_own"
  on public.guided_visits
  for update
  to authenticated
  using (auth.uid() = user_id);

create index guided_visits_token_idx on public.guided_visits (token);
create index guided_visits_user_idx on public.guided_visits (user_id);
create index guided_visits_museum_idx on public.guided_visits (museum_slug);
