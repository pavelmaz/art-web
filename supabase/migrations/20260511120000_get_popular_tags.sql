CREATE OR REPLACE FUNCTION get_popular_tags(min_count int DEFAULT 200)
RETURNS TABLE (tag text, count bigint)
LANGUAGE sql STABLE
AS $$
  SELECT unnest(tags) AS tag, count(*) AS count
  FROM artworks
  WHERE tags IS NOT NULL
  GROUP BY tag
  HAVING count(*) >= min_count
  ORDER BY count DESC;
$$;
