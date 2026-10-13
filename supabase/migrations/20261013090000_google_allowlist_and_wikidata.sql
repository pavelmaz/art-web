-- Google index pilot (13 Oct 2026). Applied to prod via MCP as
-- google_allowlist_proposal + artwork_wikidata; kept here for the record.

-- Pages Google may index. status: proposed | approved | excluded.
-- scripts/build-google-allowlist.mjs turns the approved rows into
-- lib/google-allowlist.generated.ts (middleware + core sitemap read it).
create table if not exists public.google_allowlist (
  path text primary key,          -- site path as served, e.g. /artworks/the-starry-night
  kind text not null,             -- hub | locale | artist | artwork
  label text,
  ref_id text,                    -- artworks.id / artists.slug
  score numeric,
  px int,
  status text not null default 'proposed',
  created_at timestamptz not null default now()
);
alter table public.google_allowlist enable row level security;

-- Documented facts per artwork from Wikidata, filled by scripts/wikidata-artwork-facts.mjs.
-- facts: { qid, title, creator[], inception, collections[{qid,label,inventory}], museum,
--          location[], material[], height, width, genre[], movement[], depicts[], created_in[], enwiki }
create table if not exists public.artwork_wikidata (
  artwork_id text primary key references public.artworks(id) on delete cascade,
  qid text,                 -- null = looked up, no confident match
  match_method text,        -- commons-p6243 | commons-template | creator-title
  facts jsonb,
  fetched_at timestamptz not null default now()
);
alter table public.artwork_wikidata enable row level security;
