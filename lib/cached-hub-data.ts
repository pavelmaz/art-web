import type { AggregatedHubEntry } from "@/lib/aggregate-artworks";
import { PAGE_SIZE } from "@/lib/pagination";
import { supabase } from "@/lib/supabase";
import { artworkImageUrl, slugify } from "@/lib/utils";

type StyleRow = {
  name: string;
  slug: string;
  description: string | null;
};

type HubRpcRow = {
  display: string;
  count: number;
  image_id: string | null;
  url: string | null;
};

export type CachedArtistHubEntry = {
  artistName: string;
  count: number;
  image_id: string | null;
  url: string | null;
  slug: string;
};

export type ArtistHubListItem = {
  display: string;
  count: number;
  image_id: string | null;
  url: string | null;
  slug: string | null;
};

export async function getCachedGenreHub() {
  const { data, error } = await supabase.rpc("get_genre_hub");
  if (error || !data || data.length === 0) {
    console.error("get_genre_hub failed:", error?.message);
    return [];
  }
  return (data as HubRpcRow[]).map((r) => ({
    display: r.display,
    count: r.count,
    image_id: r.image_id,
    url: r.url,
  }));
}

export async function getCachedMuseumHub() {
  const { data, error } = await supabase.rpc("get_museum_hub");
  if (error || !data || data.length === 0) {
    console.error("get_museum_hub failed:", error?.message);
    return [];
  }
  return (data as HubRpcRow[]).map((r) => ({
    display: r.display,
    count: r.count,
    image_id: r.image_id,
    url: r.url,
  }));
}

export async function getCachedStylesHubData(): Promise<{ agg: AggregatedHubEntry[]; styles: StyleRow[] }> {
  const [aggRes, stylesRes] = await Promise.all([
    supabase.rpc("get_style_hub"),
    supabase.from("styles").select("name, slug, description").order("name", { ascending: true }),
  ]);

  if (stylesRes.error) {
    console.error("getCachedStylesHubData styles query failed:", stylesRes.error.message);
    return { agg: [], styles: [] };
  }

  const styles = (stylesRes.data as StyleRow[] | null) ?? [];

  const { data: aggData, error: aggError } = aggRes;
  if (aggError || !aggData || aggData.length === 0) {
    console.error("get_style_hub failed:", aggError?.message);
    return {
      agg: [],
      styles,
    };
  }

  return {
    agg: (aggData as HubRpcRow[]).map((r) => ({
      display: r.display,
      count: r.count,
      image_id: r.image_id,
      url: r.url,
    })),
    styles,
  };
}

export async function getCachedArtistsHubList(): Promise<ArtistHubListItem[]> {
  const { data, error } = await supabase
    .from("artists")
    .select("name, slug, image_url, artwork_count")
    .gt("artwork_count", 0)
    .not("name", "ilike", "http%") // skip junk records whose "name" is a source URI
    .order("artwork_count", { ascending: false });

  if (error || !data || data.length === 0) {
    console.error("getCachedArtistsHubList failed:", error?.message);
    const { data: fallback } = await supabase.rpc("get_artist_hub");
    return (fallback || []).map((r: HubRpcRow): ArtistHubListItem => ({
      display: r.display,
      count: r.count,
      image_id: r.image_id,
      url: r.url,
      slug: null,
    }));
  }

  return data.map(
    (a: { name: string; slug: string; image_url: string | null; artwork_count: number }): ArtistHubListItem => ({
      display: a.name,
      count: a.artwork_count,
      image_id: a.image_url || null,
      url: null,
      slug: a.slug,
    }),
  );
}

function hasWorkingArtistPreview(item: ArtistHubListItem): boolean {
  const imageId = item.image_id?.trim();
  if (!imageId) {
    return false;
  }
  return Boolean(artworkImageUrl({ url: item.url ?? null, image_id: imageId }));
}

async function fetchArtworkPreviewForArtist(
  artistName: string,
): Promise<{ image_id: string; url: string | null } | null> {
  const queries = [
    () =>
      supabase
        .from("artworks")
        .select("image_id, url, score")
        .ilike("artist_display", artistName)
        .not("image_id", "is", null)
        .neq("image_id", "")
        .order("score", { ascending: false })
        .limit(12),
    () =>
      supabase
        .from("artworks")
        .select("image_id, url, score")
        .eq("artist_display", artistName)
        .not("image_id", "is", null)
        .neq("image_id", "")
        .order("score", { ascending: false })
        .limit(12),
  ];

  for (const runQuery of queries) {
    const { data, error } = await runQuery();
    if (error) {
      console.error("fetchArtworkPreviewForArtist failed:", artistName, error.message);
      continue;
    }

    for (const row of data ?? []) {
      const image_id = row.image_id?.trim();
      if (!image_id) {
        continue;
      }
      const url = row.url ?? null;
      if (artworkImageUrl({ url, image_id })) {
        return { image_id, url };
      }
    }
  }

  return null;
}

/** Fill missing/broken hub previews from artworks (top scored, renderable image). */
export async function fillArtistHubPreviewImages(items: ArtistHubListItem[]): Promise<ArtistHubListItem[]> {
  const needsFill = items.filter((item) => !hasWorkingArtistPreview(item));
  if (!needsFill.length) {
    return items;
  }

  const filled = new Map<string, { image_id: string; url: string | null }>();

  await Promise.all(
    needsFill.map(async (item) => {
      const preview = await fetchArtworkPreviewForArtist(item.display);
      if (preview) {
        filled.set(item.display, preview);
      }
    }),
  );

  return items.map((item) => {
    const preview = filled.get(item.display);
    if (preview) {
      return {
        ...item,
        image_id: preview.image_id,
        url: preview.url,
      };
    }
    return item;
  });
}

type ArtistHubPageRow = HubRpcRow & { total_count: number };

export type ArtistsHubPageResult = {
  artists: CachedArtistHubEntry[];
  totalCount: number;
};

function mapArtistHubRows(rows: HubRpcRow[]): CachedArtistHubEntry[] {
  return rows.map((r) => ({
    artistName: r.display,
    count: r.count,
    image_id: r.image_id,
    url: r.url,
    slug: slugify(r.display),
  }));
}

async function fetchArtistsHubPageUncached(
  pageNum: number,
  size: number,
): Promise<ArtistsHubPageResult> {
  const { data, error } = await supabase.rpc("get_artist_hub_page", {
    page_num: pageNum,
    page_size: size,
  });

  if (error) {
    if (error.code === "PGRST202") {
      console.warn("get_artist_hub_page not deployed; using get_artist_hub fallback");
      const { data: fallback, error: fallbackError } = await supabase.rpc("get_artist_hub");
      if (fallbackError || !fallback || fallback.length === 0) {
        console.error("get_artist_hub failed:", fallbackError?.message);
        return { artists: [], totalCount: 0 };
      }
      const all = mapArtistHubRows(fallback as HubRpcRow[]);
      const from = (pageNum - 1) * size;
      return {
        artists: all.slice(from, from + size),
        totalCount: all.length,
      };
    }

    console.error("get_artist_hub_page failed:", error.message);
    return { artists: [], totalCount: 0 };
  }

  const rows = (data as ArtistHubPageRow[] | null) ?? [];
  if (!rows.length) {
    return { artists: [], totalCount: 0 };
  }

  const totalCount = Number(rows[0]?.total_count ?? 0);
  return {
    artists: mapArtistHubRows(rows),
    totalCount,
  };
}

export async function fillCachedArtistHubPreviewImages(
  entries: CachedArtistHubEntry[],
): Promise<CachedArtistHubEntry[]> {
  if (!entries.length) {
    return entries;
  }

  const filled = await fillArtistHubPreviewImages(
    entries.map((entry) => ({
      display: entry.artistName,
      count: entry.count,
      image_id: entry.image_id,
      url: entry.url,
      slug: entry.slug,
    })),
  );

  return entries.map((entry, index) => ({
    ...entry,
    image_id: filled[index]?.image_id ?? entry.image_id,
    url: filled[index]?.url ?? entry.url,
  }));
}

export async function getArtistsHubPage(
  page: number,
  pageSize: number = PAGE_SIZE,
): Promise<ArtistsHubPageResult> {
  const pageNum = Math.max(1, page);
  const size = Math.max(1, Math.min(pageSize, 100));
  const result = await fetchArtistsHubPageUncached(pageNum, size);
  return {
    ...result,
    artists: await fillCachedArtistHubPreviewImages(result.artists),
  };
}

export async function getCachedTagsHub() {
  const { data, error } = await supabase.rpc("get_tags_hub");
  if (error || !data || data.length === 0) {
    console.error("get_tags_hub failed:", error?.message);
    return [];
  }
  return (data as { display: string; count: number; image_id: string | null; url: string | null }[]).map(
    (r) => ({
      display: r.display,
      count: r.count,
      image_id: r.image_id ?? null,
      url: r.url ?? null,
    }),
  );
}

export async function getCachedCountriesHub() {
  const { data, error } = await supabase.rpc("get_countries_hub");
  if (error || !data || data.length === 0) {
    console.error("get_countries_hub failed:", error?.message);
    return [];
  }
  return (data as { display: string; count: number; image_id: string | null; url: string | null }[]).map(
    (r) => ({
      display: r.display,
      count: r.count,
      image_id: r.image_id,
      url: r.url,
    }),
  );
}
