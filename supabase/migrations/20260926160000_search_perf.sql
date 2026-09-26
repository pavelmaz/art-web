-- Search results took 5–8 s (26 Sep 2026). Two causes on the DB side:
--
-- 1. lib/site-search.ts ORs `medium_display ilike` (and the fallback ORs
--    museum/genre_title/style_title) with the trigram-indexed title/artist.
--    Postgres cannot use an index for an OR when one branch has none, so every
--    search did a full scan of ~118k rows (11.2 s for "water lilies"; 0.32 s
--    with the index). Trigram GIN indexes on those four columns fix it.
-- 2. search_artworks returned only six columns, so the page needed a second
--    round trip to learn which hits were prints/books. It now returns the same
--    columns the page selects elsewhere, incl. object_type.
--
-- Applied to prod 26 Sep 2026 via the Supabase MCP (indexes built CONCURRENTLY).

create index concurrently if not exists idx_artworks_medium_trgm on public.artworks using gin (medium_display gin_trgm_ops);
create index concurrently if not exists idx_artworks_museum_trgm on public.artworks using gin (museum gin_trgm_ops);
create index concurrently if not exists idx_artworks_genre_trgm  on public.artworks using gin (genre_title gin_trgm_ops);
create index concurrently if not exists idx_artworks_style_trgm  on public.artworks using gin (style_title gin_trgm_ops);

drop function if exists public.search_artworks(text);

create function public.search_artworks(search_term text)
returns table (
  id text,
  title text,
  slug text,
  artist_display text,
  image_id text,
  url text,
  museum text,
  alt_text text,
  score numeric,
  tags text[],
  object_type text
)
language plpgsql
stable
as $$
declare
  tsq tsquery;
begin
  tsq := to_tsquery('simple',
    regexp_replace(
      array_to_string(
        array(select unnest(string_to_array(unaccent(trim(search_term)), ' '))),
        ':* & '
      ) || ':*',
      '\s+', ' ', 'g'
    ));

  return query
  select a.id::text, a.title, a.slug, a.artist_display, a.image_id, a.url, a.museum,
         a.alt_text, a.score, a.tags, a.object_type
  from artworks a
  where a.search_vector @@ tsq
  order by ts_rank(a.search_vector, tsq) desc, a.score desc
  limit 100;

  -- Typo tolerance: when full-text finds nothing, fall back to trigram
  -- similarity on title/artist ("watter lilies" -> Water Lilies).
  if not found then
    return query
    select a.id::text, a.title, a.slug, a.artist_display, a.image_id, a.url, a.museum,
           a.alt_text, a.score, a.tags, a.object_type
    from artworks a
    where a.title % search_term or a.artist_display % search_term
    order by greatest(similarity(a.title, search_term), similarity(coalesce(a.artist_display, ''), search_term)) desc,
      a.score desc
    limit 50;
  end if;
end;
$$;

grant execute on function public.search_artworks(text) to anon, authenticated, service_role;
