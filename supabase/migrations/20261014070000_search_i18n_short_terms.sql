-- Multilingual search follow-up (14 Oct 2026, after the 06:53 UTC database restart).
-- Applied to prod via MCP as search_i18n_pgroonga*, search_i18n_drop_pgroonga,
-- search_vector_i18n_refresh; final state recorded here.
--
-- * Terms shorter than 3 characters (모네, 睡蓮 — most CJK words) can't use pg_trgm, and
--   `ilike '%모네%'` scanned the whole table and hit the 3 s anon timeout. Such terms now
--   rely on the full-text index (prefix match) and artist names; "contains" branches run
--   only for 3+ characters.
-- * PGroonga was tried for CJK substrings and REMOVED: the 1 GB instance ran out of memory
--   and restarted while its indexes were being maintained during a bulk refresh. Don't
--   re-add it without a larger compute size.
-- * An OR across several per-column indexes made the planner fall back to a full scan —
--   use UNION of per-column lookups instead.

create table if not exists public._i18n_refresh_todo (id text primary key);
create or replace function public.search_vector_i18n_refresh(n int)
returns int language plpgsql set search_path = public as $$
declare c int;
begin
  with t as (select id from _i18n_refresh_todo limit n),
       u as (update artworks a set search_vector_i18n = search_vector_i18n_for(a) from t where a.id = t.id returning a.id)
  delete from _i18n_refresh_todo d using u where d.id = u.id;
  get diagnostics c = row_count;
  return c;
end $$;
revoke all on function public.search_vector_i18n_refresh(int) from public, anon, authenticated;

create or replace function public.search_artworks_i18n(search_term text, locale text default 'en')
returns table(id text, title text, title_local text, slug text, artist_display text, image_id text, url text,
              museum text, alt_text text, score numeric, tags text[], object_type text)
language plpgsql stable set search_path = public, extensions as $$
declare
  term text := trim(search_term);
  pat text;
  is_cjk boolean;
  long_enough boolean;
  tsq tsquery;
  col text;
begin
  if term = '' then return; end if;
  pat := '%' || term || '%';
  is_cjk := term ~ '[぀-ヿ㐀-䶿一-鿿가-힯]';
  long_enough := char_length(term) >= 3;   -- pg_trgm can only index patterns of 3+ characters
  tsq := to_tsquery('simple',
    regexp_replace(array_to_string(array(select unnest(string_to_array(unaccent(term), ' '))), ':* & ') || ':*', '\s+', ' ', 'g'));

  return query
  with fts as (
    select a.id, (greatest(ts_rank(a.search_vector, tsq), ts_rank(coalesce(a.search_vector_i18n, ''::tsvector), tsq)) + 1.0)::real as r, a.score
    from artworks a
    where a.search_vector @@ tsq or a.search_vector_i18n @@ tsq
    order by r desc, a.score desc limit 100),
  artist_hits as (
    -- Names/aliases in any language containing the term (ゴッホ in フィンセント・ファン・ゴッホ).
    -- Small table (~120k short names): fine even when the term is too short for the index.
    select n.artist_slug from artist_names_i18n n where n.name ilike pat group by n.artist_slug),
  byartist as (
    select a.id, 0.9::real as r, a.score
    from artworks a
    where a.artist_display in (
      select ar.name from artists ar where ar.slug in (select artist_slug from artist_hits)
      order by ar.artwork_count desc nulls last limit 5)
    order by a.score desc limit 100),
  substr as (
    -- CJK titles have no word spaces: match inside titles (trigram-indexed, 3+ characters).
    select x.id, 0.5::real as r, x.score from (
      select a.id, a.score from artworks a where is_cjk and long_enough and a.title_jp ilike pat
      union
      select a.id, a.score from artworks a where is_cjk and long_enough and a.title_ch ilike pat
      union
      select a.id, a.score from artworks a where is_cjk and long_enough and a.title_ko ilike pat) x
    order by x.score desc limit 100),
  u as (select * from fts union all select * from byartist union all select * from substr),
  best as (select distinct on (u.id) u.id, u.r, u.score from u order by u.id, u.r desc)
  select a.id::text, a.title, localized_title(a, locale), a.slug, a.artist_display, a.image_id, a.url,
         a.museum, a.alt_text, a.score, a.tags, a.object_type
  from best b join artworks a on a.id = b.id
  order by b.r desc, b.score desc limit 100;

  -- Typo tolerance (Latin/Cyrillic, 3+ characters) on trigram-indexed columns only.
  if not found and not is_cjk and long_enough then
    col := case locale when 'es' then 'title_sp' when 'pt' then 'title_pt' when 'fr' then 'title_fr'
             when 'de' then 'title_ger' when 'it' then 'title_it' when 'ru' then 'title_ru' else 'title' end;
    return query execute format(
      'select a.id::text, a.title, localized_title(a, $2), a.slug, a.artist_display, a.image_id, a.url,
              a.museum, a.alt_text, a.score, a.tags, a.object_type
       from artworks a
       where a.%1$I %% $1 or a.title %% $1 or a.artist_display %% $1
       order by greatest(similarity(coalesce(a.%1$I, %2$L), $1), similarity(a.title, $1),
                         similarity(coalesce(a.artist_display, %2$L), $1)) desc, a.score desc
       limit 50', col, '') using term, locale;
  end if;
end $$;

create or replace function public.search_artists_i18n(search_term text, locale text default 'en')
returns table(name text, name_local text, slug text, image_url text, artwork_count int)
language sql stable set search_path = public as $$
  with term as (select trim(search_term) t),
  hits as (
    select n.artist_slug from artist_names_i18n n, term where n.name ilike '%' || term.t || '%'
    union
    select ar.slug from artists ar, term where ar.name ilike '%' || term.t || '%')
  select ar.name,
         coalesce((select n2.name from artist_names_i18n n2 where n2.artist_slug = ar.slug and n2.lang = locale and n2.kind = 'label' limit 1), ar.name),
         ar.slug, ar.image_url, ar.artwork_count::int
  from artists ar, term
  where term.t <> '' and ar.slug in (select artist_slug from hits)
  order by ar.artwork_count desc nulls last
  limit 20
$$;
