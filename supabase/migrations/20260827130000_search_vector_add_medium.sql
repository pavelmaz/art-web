-- Add medium_display to the artworks full-text search vector so visitors can
-- search by medium ("oil", "etching", "watercolour", "gouache", …).
-- Weight C, alongside genre_title / style_title (descriptive categories).
--
-- Requested by a University of Leeds fine-art student who wanted to filter by
-- medium. The trigger covers all future inserts/updates; existing rows were
-- backfilled once with:
--   UPDATE artworks
--   SET search_vector = search_vector
--     || setweight(to_tsvector('simple', coalesce(medium_display, '')), 'C')
--   WHERE medium_display IS NOT NULL AND medium_display <> '';

CREATE OR REPLACE FUNCTION public.update_search_vector()
RETURNS trigger LANGUAGE plpgsql AS $function$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(unaccent(new.title), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(unaccent(new.artist_display), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.museum, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.genre_title, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.style_title, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.medium_display, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.tags, ' '), '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.location, '')), 'D');
  return new;
end;
$function$;
