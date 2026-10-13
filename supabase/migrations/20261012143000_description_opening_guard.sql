-- Anti-duplicate guard for generated artwork descriptions (12 Oct 2026).
-- Every English description's opening is fingerprinted; enrich-artworks refuses
-- to publish a new description whose opening already appears on other works.
-- (Applied to prod via MCP as description_opening_guard + description_opening_guard_recent.)

create or replace function public.desc_opening_words(t text, n int)
returns text language sql immutable parallel safe as $$
  select array_to_string(
    (regexp_split_to_array(
      btrim(regexp_replace(
        lower(regexp_replace(coalesce(t, ''), '[*_“”"«»„「」『』‘’''()\[\]]', '', 'g')),
        '[^a-z0-9à-ÿ]+', ' ', 'g')),
      ' '))[1:n], ' ')
$$;

create table if not exists public.desc_openings (
  artwork_id text primary key references public.artworks(id) on delete cascade,
  w3 text not null,   -- first 3 words (readable, for template detection)
  w6 text not null,   -- first 6 words (near-identical openings)
  updated_at timestamptz not null default now()
);
create index if not exists desc_openings_w3_idx on public.desc_openings (w3);
create index if not exists desc_openings_w6_idx on public.desc_openings (w6);
create index if not exists desc_openings_updated_idx on public.desc_openings (updated_at);
alter table public.desc_openings enable row level security;

-- Keep fingerprints in sync whatever writes the description (edge fn, scripts, SQL).
create or replace function public.desc_openings_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.description is null or length(btrim(new.description)) = 0 then
    delete from public.desc_openings where artwork_id = new.id;
  else
    insert into public.desc_openings (artwork_id, w3, w6, updated_at)
    values (new.id, desc_opening_words(new.description, 3), desc_opening_words(new.description, 6), now())
    on conflict (artwork_id) do update set w3 = excluded.w3, w6 = excluded.w6, updated_at = now();
  end if;
  return null;
end $$;

drop trigger if exists artworks_desc_openings_sync on public.artworks;
create trigger artworks_desc_openings_sync
  after insert or update of description on public.artworks
  for each row execute function public.desc_openings_sync();

-- How many OTHER works already open the same way.
create or replace function public.desc_opening_check(t text, exclude_id text default null)
returns table (w3 text, n3 bigint, w6 text, n6 bigint)
language sql stable security definer set search_path = public as $$
  with f as (select desc_opening_words(t, 3) w3, desc_opening_words(t, 6) w6)
  select f.w3,
         (select count(*) from desc_openings o where o.w3 = f.w3 and o.artwork_id is distinct from exclude_id),
         f.w6,
         (select count(*) from desc_openings o where o.w6 = f.w6 and o.artwork_id is distinct from exclude_id)
  from f
$$;
revoke all on function public.desc_opening_check(text, text) from public, anon, authenticated;

-- Openings repeated among descriptions written in the last N days.
create or replace function public.desc_opening_recent_repeats(days int default 7, min_works int default 3)
returns table (w3 text, works bigint, catalogue_total bigint)
language sql stable security definer set search_path = public as $$
  select r.w3, count(*), (select count(*) from desc_openings a where a.w3 = r.w3)
  from desc_openings r
  where r.updated_at > now() - make_interval(days => days)
  group by r.w3 having count(*) >= min_works
  order by count(*) desc limit 20
$$;
revoke all on function public.desc_opening_recent_repeats(int, int) from public, anon, authenticated;

-- Works the enricher refused to publish (kept out of the queue until reviewed).
alter table public.artworks add column if not exists description_rejects jsonb;
-- (created CONCURRENTLY on prod) keeps the flagged-works count off a full table scan
create index if not exists artworks_description_rejects_idx on public.artworks (id) where description_rejects is not null;

-- Repetition report: the most-repeated openings across the whole catalogue.
create or replace view public.desc_opening_report with (security_invoker = true) as
  select w3, count(*) as works, min(artwork_id) as example_id
  from public.desc_openings group by w3 having count(*) >= 20
  order by count(*) desc;
revoke all on public.desc_opening_report from anon, authenticated;

-- Backfill (run once, in 25k-row batches to stay under the statement timeout):
-- insert into public.desc_openings (artwork_id, w3, w6, updated_at)
-- select id, desc_opening_words(description,3), desc_opening_words(description,6), '2000-01-01'
-- from public.artworks where description is not null and length(btrim(description)) > 0
-- on conflict (artwork_id) do nothing;
