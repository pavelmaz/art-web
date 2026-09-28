-- Everything an artwork page shows besides the artwork row itself, in one round
-- trip (28 Sep 2026): the page used to make up to 7 separate requests per render
-- (translation, artist card, works by the artist, works in the genre, genre and
-- style hub links). Each piece mirrors the query it replaces, so pages render
-- the same; security invoker, so the caller's permissions apply as before.
-- Called from lib/artwork-page-data.ts. Measured on 90 test pages: 366 → 195
-- database requests with byte-identical visible output.
--
-- Applied to prod 28 Sep 2026 via the Supabase MCP (migration `artwork_page_extras`).
create or replace function public.artwork_page_extras(
  p_artwork_id text,
  p_artist text,       -- artworks.artist_display as stored; null when blank
  p_artist_slug text,  -- slugify(artist_display) from the app; null when empty
  p_genre text,        -- artworks.genre_title as stored; null when empty
  p_genre_hub text,    -- trimmed genre name for the breadcrumb/hub link
  p_style_hub text,    -- trimmed style name for the breadcrumb/hub link
  p_locale text
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_title_col text := case p_locale
    when 'es' then 'title_sp' when 'pt' then 'title_pt' when 'ja' then 'title_jp'
    when 'fr' then 'title_fr' when 'de' then 'title_ger' when 'it' then 'title_it'
    when 'ko' then 'title_ko' when 'ru' then 'title_ru' when 'zh' then 'title_ch'
  end;
  v_translation jsonb;
  v_artist_card jsonb;
  v_by_artist jsonb := '[]'::jsonb;
  v_by_genre jsonb := '[]'::jsonb;
  v_genre jsonb;
  v_style jsonb;
  v_name text;
  v_image_url text;
  v_count integer;
begin
  select jsonb_build_object('alt_text', t.alt_text, 'seo_description', t.seo_description)
    into v_translation
    from artwork_translations t
    where t.artwork_id = p_artwork_id and t.locale = p_locale;

  -- Same rule as the old getArtistCard(): stored count when the row is this
  -- exact artist, otherwise a live count.
  if p_artist is not null and p_artist_slug is not null then
    select ar.name, ar.image_url, ar.artwork_count
      into v_name, v_image_url, v_count
      from artists ar
      where ar.slug = p_artist_slug;
    if v_name is distinct from p_artist or coalesce(v_count, 0) <= 0 then
      select count(*)::int into v_count from artworks w where w.artist_display = p_artist;
    end if;
    v_artist_card := jsonb_build_object('artworkCount', coalesce(v_count, 0), 'portrait', v_image_url);
  end if;

  if p_artist is not null then
    select coalesce(jsonb_agg(r.row_json), '[]'::jsonb) into v_by_artist
    from (
      select jsonb_build_object(
          'id', a.id, 'title', a.title, 'slug', a.slug, 'artist_display', a.artist_display,
          'image_id', a.image_id, 'url', a.url, 'museum', a.museum, 'style_title', a.style_title,
          'genre_title', a.genre_title, 'score', a.score, 'alt_text', a.alt_text
        ) || case when v_title_col is null then '{}'::jsonb else jsonb_build_object(v_title_col, case p_locale
          when 'es' then a.title_sp when 'pt' then a.title_pt when 'ja' then a.title_jp
          when 'fr' then a.title_fr when 'de' then a.title_ger when 'it' then a.title_it
          when 'ko' then a.title_ko when 'ru' then a.title_ru when 'zh' then a.title_ch end) end as row_json
      from artworks a
      where a.artist_display = p_artist
      order by a.score desc
      limit 20
    ) r;
  end if;

  -- The old query had no ORDER BY but always ran on idx_artworks_genre_score,
  -- i.e. highest score first (checked for every genre on 28 Sep 2026); the
  -- explicit order keeps that result and makes it deterministic.
  if p_genre is not null then
    select coalesce(jsonb_agg(r.row_json), '[]'::jsonb) into v_by_genre
    from (
      select jsonb_build_object(
          'id', a.id, 'title', a.title, 'slug', a.slug, 'artist_display', a.artist_display,
          'image_id', a.image_id, 'url', a.url, 'museum', a.museum, 'style_title', a.style_title,
          'genre_title', a.genre_title, 'alt_text', a.alt_text
        ) || case when v_title_col is null then '{}'::jsonb else jsonb_build_object(v_title_col, case p_locale
          when 'es' then a.title_sp when 'pt' then a.title_pt when 'ja' then a.title_jp
          when 'fr' then a.title_fr when 'de' then a.title_ger when 'it' then a.title_it
          when 'ko' then a.title_ko when 'ru' then a.title_ru when 'zh' then a.title_ch end) end as row_json
      from artworks a
      where a.genre_title = p_genre and a.id <> p_artwork_id
      order by a.score desc
      limit 6
    ) r;
  end if;

  if p_genre_hub is not null then
    select to_jsonb(g) into v_genre from (
      select name, slug, name_es, name_pt, name_ja, name_fr, name_de, name_it, name_ko, name_ru, name_zh,
             slug_es, slug_pt, slug_ja, slug_fr, slug_de, slug_it, slug_ko, slug_ru, slug_zh
      from genres where name = p_genre_hub
    ) g;
  end if;

  if p_style_hub is not null then
    select to_jsonb(s) into v_style from (
      select name, slug, name_es, name_pt, name_ja, name_fr, name_de, name_it, name_ko, name_ru, name_zh,
             slug_es, slug_pt, slug_ja, slug_fr, slug_de, slug_it, slug_ko, slug_ru, slug_zh
      from styles where name = p_style_hub
    ) s;
  end if;

  return jsonb_build_object(
    'translation', v_translation,
    'artistCard', v_artist_card,
    'relatedByArtist', v_by_artist,
    'relatedByGenre', v_by_genre,
    'genre', v_genre,
    'style', v_style
  );
end;
$$;
