-- Disk IO relief after the 27–28 Sep 2026 overnight scraper surge (10× traffic
-- for 7 h) exhausted the Micro instance's Disk IO budget: statement timeouts from
-- 01:45 UTC and a Postgres restart at 02:47.
--
-- 1. Seven exact duplicate indexes on artworks. Each has an identical twin that
--    stays (same columns, operator class and predicate), so every query plan is
--    unchanged — search probes returned the same rows before and after. Dropping
--    them makes each artworks UPDATE write 7 fewer index entries and frees
--    ~133 MB of memory for caching.
-- 2. artists.artwork_count is now the source for the "N artworks" line on
--    artwork pages (lib/get-artist-card.ts). Counting artworks per artist on every
--    render was ~37% of all disk reads. Only /api/import-artworks updated the
--    column, so script imports left it stale (30 artists, e.g. 8 stored vs 403);
--    a nightly cron now recounts.
--
-- Applied to prod 28 Sep 2026 via the Supabase MCP (indexes dropped CONCURRENTLY,
-- the function + cron as migration `recount_artist_artworks`).

drop index concurrently if exists public.artworks_museum_idx;               -- twin: idx_artworks_museum
drop index concurrently if exists public.idx_artworks_score_image;          -- twin: idx_artworks_score_hasimage
drop index concurrently if exists public.idx_artworks_title_trgm;           -- twin: artworks_title_trgm (the one the planner picks)
drop index concurrently if exists public.idx_artworks_slug;                 -- twin: artworks_slug_idx (UNIQUE, kept)
drop index concurrently if exists public.idx_artworks_artist_display_trgm;  -- twin: artworks_artist_trgm
drop index concurrently if exists public.idx_artworks_artist_trgm;          -- twin: artworks_artist_trgm
drop index concurrently if exists public.idx_artworks_trgm_artist_display;  -- twin: artworks_artist_trgm

create or replace function public.recount_artist_artworks()
returns integer
language sql
set search_path = public
as $$
  with c as (
    select artist_display, count(*)::int as n
    from artworks
    where artist_display is not null
    group by artist_display
  ), upd as (
    update artists a
    set artwork_count = c.n
    from c
    where a.name = c.artist_display
      and a.artwork_count is distinct from c.n
    returning 1
  )
  select count(*)::int from upd;
$$;

-- Cron-only: not callable through the public API.
revoke execute on function public.recount_artist_artworks() from public, anon, authenticated;

-- 01:30 UTC, before the 02:00 hub refresh reads the counts.
select cron.schedule('recount-artist-artworks', '30 1 * * *', $cron$select public.recount_artist_artworks()$cron$);
