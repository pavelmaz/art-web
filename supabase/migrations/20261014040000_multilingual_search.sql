-- Multilingual search (14 Oct 2026). Applied to prod via MCP in four steps
-- (multilingual_search_names, search_vector_i18n, search_i18n_rpcs,
-- search_vector_i18n_helpers + db_size_mb_security_definer); kept here for the record.
--
-- Japanese / Korean / Chinese / Russian / Spanish… visitors got 0 results because
-- `search_artworks` only indexed the English title, artist, museum, genre, style
-- and tags. Same mechanism as English, now fed with each language's own data:
--   * the 9 translated titles (title_sp … title_ch) + Chinese artist names
--   * artist names and aliases in 9 languages from Wikidata (artist_names_i18n)
--   * museum names from Wikidata (museum_names_i18n)
--   * genre / style names from genres.name_<lang> / styles.name_<lang>
-- Descriptions stay out of the index, as in English. No AI at query time.

-- ---------------------------------------------------------------- names
alter table public.artists add column if not exists wikidata_qid text;
create index if not exists artists_wikidata_qid_idx on public.artists (wikidata_qid) where wikidata_qid is not null;
create index if not exists artists_name_idx on public.artists (name);

create table if not exists public.artist_names_i18n (
  artist_slug text not null references public.artists(slug) on delete cascade,
  lang text not null,          -- en ja zh ko ru es pt fr de it
  name text not null,
  kind text not null,          -- label | alias
  primary key (artist_slug, lang, name)
);
create index if not exists artist_names_i18n_name_trgm on public.artist_names_i18n using gin (name gin_trgm_ops);
alter table public.artist_names_i18n enable row level security;
create policy "artist_names_i18n read" on public.artist_names_i18n for select using (true);

create table if not exists public.museum_names_i18n (
  museum text not null,        -- exact artworks.museum value
  lang text not null,
  name text not null,
  qid text,
  primary key (museum, lang, name)
);
alter table public.museum_names_i18n enable row level security;
create policy "museum_names_i18n read" on public.museum_names_i18n for select using (true);

-- ---------------------------------------------------------------- index column
alter table public.artworks add column if not exists search_vector_i18n tsvector;

create or replace function public.search_vector_i18n_for(a public.artworks)
returns tsvector language sql stable set search_path = public as $$
  select
    setweight(to_tsvector('simple', unaccent(concat_ws(' ',
      a.title_sp, a.title_pt, a.title_fr, a.title_ger, a.title_it,
      a.title_jp, a.title_ko, a.title_ru, a.title_ch, a.artist_display_ch))), 'A')
    || setweight(to_tsvector('simple', unaccent(coalesce((
         select string_agg(n.name, ' ')
         from artist_names_i18n n join artists ar on ar.slug = n.artist_slug
         where ar.name = a.artist_display), ''))), 'A')
    || setweight(to_tsvector('simple', unaccent(coalesce((
         select string_agg(m.name, ' ') from museum_names_i18n m where m.museum = a.museum), ''))), 'B')
    || setweight(to_tsvector('simple', unaccent(coalesce((
         select concat_ws(' ', g.name_es, g.name_pt, g.name_fr, g.name_de, g.name_it, g.name_ja, g.name_ko, g.name_ru, g.name_zh)
         from genres g where lower(g.name) = lower(a.genre_title) limit 1), ''))), 'C')
    || setweight(to_tsvector('simple', unaccent(coalesce((
         select concat_ws(' ', s.name_es, s.name_pt, s.name_fr, s.name_de, s.name_it, s.name_ja, s.name_ko, s.name_ru, s.name_zh)
         from styles s where lower(s.name) = lower(a.style_title) limit 1), ''))), 'C')
$$;

create or replace function public.update_search_vector_i18n()
returns trigger language plpgsql as $$
begin
  new.search_vector_i18n := public.search_vector_i18n_for(new);
  return new;
end $$;

drop trigger if exists artworks_search_vector_i18n_update on public.artworks;
create trigger artworks_search_vector_i18n_update
  before insert or update of title_sp, title_pt, title_fr, title_ger, title_it, title_jp, title_ko, title_ru, title_ch,
    artist_display, artist_display_ch, museum, genre_title, style_title
  on public.artworks for each row execute function public.update_search_vector_i18n();

-- GIN on the vector; trigram "contains" indexes on every translated title
-- (Japanese/Chinese titles have no word spaces, the rest back the typo fallback
-- and the localized ilike branches in lib/site-search.ts). Created CONCURRENTLY on prod.
create index if not exists artworks_search_vector_i18n_idx on public.artworks using gin (search_vector_i18n);
create index if not exists artworks_title_jp_trgm on public.artworks using gin (title_jp gin_trgm_ops);
create index if not exists artworks_title_ch_trgm on public.artworks using gin (title_ch gin_trgm_ops);
create index if not exists artworks_title_ko_trgm on public.artworks using gin (title_ko gin_trgm_ops);
create index if not exists artworks_title_ru_trgm on public.artworks using gin (title_ru gin_trgm_ops);
create index if not exists artworks_title_sp_trgm on public.artworks using gin (title_sp gin_trgm_ops);
create index if not exists artworks_title_pt_trgm on public.artworks using gin (title_pt gin_trgm_ops);
create index if not exists artworks_title_fr_trgm on public.artworks using gin (title_fr gin_trgm_ops);
create index if not exists artworks_title_ger_trgm on public.artworks using gin (title_ger gin_trgm_ops);
create index if not exists artworks_title_it_trgm on public.artworks using gin (title_it gin_trgm_ops);

-- Backfill helpers (scripts/backfill-search-vector-i18n.mjs).
create index if not exists artworks_search_vector_i18n_todo on public.artworks (id) where search_vector_i18n is null;
create or replace function public.search_vector_i18n_backfill(n int)
returns int language plpgsql set search_path = public as $$
declare c int;
begin
  with todo as (select id from artworks where search_vector_i18n is null order by id limit n)
  update artworks a set search_vector_i18n = search_vector_i18n_for(a) from todo where a.id = todo.id;
  get diagnostics c = row_count;
  return c;
end $$;
create or replace function public.search_vector_i18n_reset(n int)
returns int language plpgsql set search_path = public as $$
declare c int;
begin
  with todo as (select id from artworks where search_vector_i18n is not null limit n)
  update artworks a set search_vector_i18n = null from todo where a.id = todo.id;
  get diagnostics c = row_count;
  return c;
end $$;
revoke all on function public.search_vector_i18n_backfill(int) from public, anon, authenticated;
revoke all on function public.search_vector_i18n_reset(int) from public, anon, authenticated;
create or replace function public.db_size_mb()
returns table (db_mb int, wal_mb int) language sql stable security definer set search_path = public as $$
  select (pg_database_size(current_database()) / 1048576)::int,
         ((select coalesce(sum(size), 0) from pg_ls_waldir()) / 1048576)::int
$$;
revoke all on function public.db_size_mb() from public, anon, authenticated;

-- ---------------------------------------------------------------- RPCs
create or replace function public.localized_title(a public.artworks, locale text)
returns text language sql immutable as $$
  select coalesce(nullif(case locale
    when 'es' then a.title_sp when 'pt' then a.title_pt when 'fr' then a.title_fr
    when 'de' then a.title_ger when 'it' then a.title_it when 'ja' then a.title_jp
    when 'ko' then a.title_ko when 'ru' then a.title_ru when 'zh' then a.title_ch end, ''), a.title)
$$;

-- search_artworks (English) is untouched; localized search pages call this one.
create or replace function public.search_artworks_i18n(search_term text, locale text default 'en')
returns table(id text, title text, title_local text, slug text, artist_display text, image_id text, url text,
              museum text, alt_text text, score numeric, tags text[], object_type text)
language plpgsql stable set search_path = public as $$
declare
  term text := trim(search_term);
  pat text;
  is_cjk boolean;
  tsq tsquery;
begin
  if term = '' then return; end if;
  pat := '%' || term || '%';
  -- Japanese / Chinese / Korean scripts: titles have no word spaces, so also match inside titles.
  is_cjk := term ~ '[぀-ヿ㐀-䶿一-鿿가-힯]';
  tsq := to_tsquery('simple',
    regexp_replace(array_to_string(array(select unnest(string_to_array(unaccent(term), ' '))), ':* & ') || ':*', '\s+', ' ', 'g'));

  return query
  with fts as (
    -- English index OR multilingual index (translated titles, artist/museum/genre/style names).
    select a.id, (greatest(ts_rank(a.search_vector, tsq), ts_rank(coalesce(a.search_vector_i18n, ''::tsvector), tsq)) + 1.0)::real as r, a.score
    from artworks a
    where a.search_vector @@ tsq or a.search_vector_i18n @@ tsq
    order by r desc, a.score desc limit 100),
  byartist as (
    -- Any artist name/alias in any language containing the term (ゴッホ in フィンセント・ファン・ゴッホ).
    select a.id, 0.9::real as r, a.score
    from artworks a
    where a.artist_display in (
      select ar.name from artist_names_i18n n join artists ar on ar.slug = n.artist_slug
      where n.name ilike pat group by ar.name order by max(ar.artwork_count) desc nulls last limit 5)
    order by a.score desc limit 100),
  substr as (
    select a.id, 0.5::real as r, a.score
    from artworks a
    where is_cjk and (a.title_jp ilike pat or a.title_ch ilike pat or a.title_ko ilike pat)
    order by a.score desc limit 100),
  u as (select * from fts union all select * from byartist union all select * from substr),
  best as (select distinct on (u.id) u.id, u.r, u.score from u order by u.id, u.r desc)
  select a.id::text, a.title, localized_title(a, locale), a.slug, a.artist_display, a.image_id, a.url,
         a.museum, a.alt_text, a.score, a.tags, a.object_type
  from best b join artworks a on a.id = b.id
  order by b.r desc, b.score desc limit 100;

  -- Typo tolerance: nothing found → similar spellings in the locale's titles or artist names.
  if not found then
    return query
    select a.id::text, a.title, localized_title(a, locale), a.slug, a.artist_display, a.image_id, a.url,
           a.museum, a.alt_text, a.score, a.tags, a.object_type
    from artworks a
    where localized_title(a, locale) % term or a.title % term or a.artist_display % term
    order by greatest(similarity(localized_title(a, locale), term), similarity(a.title, term),
                      similarity(coalesce(a.artist_display, ''), term)) desc, a.score desc
    limit 50;
  end if;
end $$;

create or replace function public.search_artists_i18n(search_term text, locale text default 'en')
returns table(name text, name_local text, slug text, image_url text, artwork_count int)
language sql stable set search_path = public as $$
  with term as (select trim(search_term) t),
  hits as (
    select n.artist_slug from artist_names_i18n n, term where n.name ilike '%' || term.t || '%'
    group by n.artist_slug)
  select ar.name,
         coalesce((select n2.name from artist_names_i18n n2 where n2.artist_slug = ar.slug and n2.lang = locale and n2.kind = 'label' limit 1), ar.name),
         ar.slug, ar.image_url, ar.artwork_count::int
  from artists ar, term
  where ar.slug in (select artist_slug from hits) or ar.name ilike '%' || term.t || '%'
  order by ar.artwork_count desc nulls last
  limit 20
$$;
