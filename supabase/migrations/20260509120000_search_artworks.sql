-- Enable unaccent (required by search_artworks). Run in SQL editor or via supabase db push.
create extension if not exists unaccent;

create or replace function search_artworks(search_term text)
returns table (
  id text,
  title text,
  slug text,
  artist_display text,
  image_id text,
  museum text
)
language sql
as $$
  SELECT id, title, slug, artist_display, image_id, museum
  FROM artworks
  WHERE
    unaccent(lower(title)) ILIKE '%' || unaccent(lower(search_term)) || '%'
    OR unaccent(lower(coalesce(artist_display,''))) ILIKE '%' || unaccent(lower(search_term)) || '%'
  ORDER BY score DESC
  LIMIT 50;
$$;

grant execute on function search_artworks(text) to anon, authenticated, service_role;
