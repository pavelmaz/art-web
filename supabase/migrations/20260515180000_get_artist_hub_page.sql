-- Paginated artist hub (avoids loading 11k+ rows per page request).
-- Apply via Supabase SQL editor or: supabase db push

create index if not exists idx_artworks_artist_display
  on public.artworks (artist_display)
  where artist_display is not null and trim(artist_display) <> '';

create or replace function public.get_artist_hub_page(
  page_num integer default 1,
  page_size integer default 30
)
returns table (
  display text,
  count bigint,
  image_id text,
  url text,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with aggregated as (
    select
      a.artist_display as display,
      count(*)::bigint as cnt,
      (array_agg(a.image_id order by a.score desc nulls last) filter (where a.image_id is not null))[1] as image_id,
      (array_agg(a.url order by a.score desc nulls last) filter (where a.url is not null))[1] as url
    from public.artworks a
    where a.artist_display is not null
      and trim(a.artist_display) <> ''
    group by a.artist_display
  ),
  ranked as (
    select
      aggregated.display,
      aggregated.cnt as count,
      aggregated.image_id,
      aggregated.url,
      count(*) over ()::bigint as total_count
    from aggregated
    order by aggregated.cnt desc, aggregated.display asc
  )
  select
    ranked.display,
    ranked.count,
    ranked.image_id,
    ranked.url,
    ranked.total_count
  from ranked
  limit greatest(least(page_size, 100), 1)
  offset greatest((greatest(page_num, 1) - 1) * greatest(least(page_size, 100), 1), 0);
$$;

grant execute on function public.get_artist_hub_page(integer, integer) to anon, authenticated, service_role;
