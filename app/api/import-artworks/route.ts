import { NextRequest, NextResponse } from "next/server";

import { supabase as supabaseAdmin } from "@/lib/supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

function makeSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[æ]/g, "ae")
    .replace(/[œ]/g, "oe")
    .replace(/[ø]/g, "o")
    .replace(/[ß]/g, "ss")
    .replace(/[đ]/g, "d")
    .replace(/[ł]/g, "l")
    .replace(/[þ]/g, "th")
    .replace(/[ð]/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

interface ArtistData {
  name: string;
  imageUrl?: string;
  birthYear?: number;
  deathYear?: number;
  nationality?: string;
}

function normalizeTitle(title: string): string {
  return title
    .replace(/\(\d{4}\)/g, "") // remove (1877)
    .replace(/\[\d{4}\]/g, "") // remove [1877]
    .replace(/,?\s*\d{4}\.?$/g, "") // remove trailing year like ", 1877" or "1877."
    .replace(/\s+/g, " ")
    .trim();
}

// Simple API key check
const API_KEY = process.env.IMPORT_API_KEY;

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  // Verify API key
  const key = req.headers.get("x-api-key");
  if (API_KEY && key !== API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const { artworks, artist } = await req.json();

  if (!artworks || !Array.isArray(artworks)) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400, headers: corsHeaders });
  }

  const results = { inserted: 0, skipped: 0, errors: [] as string[] };
  const insertedSlugs: string[] = [];
  const artistsNeedingCountUpdate = new Set<string>();

  for (const artwork of artworks) {
    try {
      const { title, artist, imageUrl, artveeUrl } = artwork;

      if (!title || !artist) {
        results.skipped++;
        continue;
      }

      // Try to find canonical artist name from artists table
      const { data: artistRecord } = await supabaseAdmin
        .from("artists")
        .select("name")
        .ilike("name", artist.trim())
        .maybeSingle();

      const canonicalArtist = artistRecord?.name || artist.trim();

      // Generate artist slug
      const artistSlug = makeSlug(canonicalArtist);

      // Check if artist exists in artists table
      const { data: existingArtist } = await supabaseAdmin
        .from("artists")
        .select("id, name, slug")
        .eq("slug", artistSlug)
        .maybeSingle();

      // If artist doesn't exist, create them
      if (!existingArtist) {
        const { error: artistError } = await supabaseAdmin.from("artists").insert({
          name: canonicalArtist,
          slug: artistSlug,
        });

        if (artistError) {
          console.error("Failed to create artist:", artistError.message);
          // Don't fail the whole import - just log
        } else {
          console.log("Created new artist:", canonicalArtist, artistSlug);
        }
      }

      // Check if artwork already exists by title + artist
      const normalizedTitle = normalizeTitle(title.trim());

      const { data: existing } = await supabaseAdmin
        .from("artworks")
        .select("id")
        .ilike("title", normalizedTitle)
        .ilike("artist_display", artist.trim())
        .maybeSingle();

      if (existing) {
        results.skipped++;
        continue;
      }

      // Generate slug from title + artist
      const slugBase = makeSlug(`${title} ${artist}`);

      // Check slug uniqueness
      let slug = slugBase;
      let counter = 1;
      while (true) {
        const { data: slugExists } = await supabaseAdmin
          .from("artworks")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (!slugExists) break;
        slug = `${slugBase}-${counter++}`;
      }

      // Insert new artwork
      const { error } = await supabaseAdmin.from("artworks").insert({
        id: slug,
        title: normalizedTitle,
        artist_display: canonicalArtist,
        image_id: imageUrl || null,
        url: artveeUrl || null,
        slug,
        score: 50, // default score
      });

      if (error) {
        const errorMsg = `${title}: ${error.message}`;
        console.error("Import error:", errorMsg);
        results.errors.push(errorMsg);
      } else {
        results.inserted++;
        insertedSlugs.push(slug);
        artistsNeedingCountUpdate.add(canonicalArtist);
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/revalidate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.IMPORT_API_KEY!,
          },
          body: JSON.stringify({
            path: `/artists/${artistSlug}`,
          }),
        });
      }
    } catch (err: any) {
      results.errors.push(err.message);
    }
  }

  // Update artwork_count for the artist(s) touched by this import
  for (const canonicalArtist of artistsNeedingCountUpdate) {
    // Update artwork_count for the artist
    const artistSlug = makeSlug(canonicalArtist);
    const { count } = await supabaseAdmin
      .from("artworks")
      .select("id", { count: "exact", head: true })
      .eq("artist_display", canonicalArtist);

    await supabaseAdmin
      .from("artists")
      .update({ artwork_count: count || 0 })
      .eq("slug", artistSlug);
  }

  if (artist?.name) {
    const artistSlug = makeSlug(artist.name);

    const updateData: any = {};
    if (artist.imageUrl) updateData.image_url = artist.imageUrl;
    if (artist.birthYear) updateData.birth_year = artist.birthYear;
    if (artist.deathYear) updateData.death_year = artist.deathYear;
    if (artist.nationality) updateData.nationality = artist.nationality;

    if (Object.keys(updateData).length > 0) {
      await supabaseAdmin.from("artists").update(updateData).eq("slug", artistSlug);
    }
  }

  // Ping Google and Bing to notify about new content
  try {
    await Promise.all([
      fetch('https://www.google.com/ping?sitemap=https://fineartfree.com/sitemap.xml'),
      fetch('https://www.bing.com/ping?sitemap=https://fineartfree.com/sitemap.xml'),
    ])
  } catch (e) {
    // Non-critical, ignore errors
  }

  // Submit new URLs to IndexNow for fast indexing
  try {
    const newUrls = insertedSlugs.flatMap((slug: string) => [
      `https://fineartfree.com/artworks/${slug}`,
      `https://fineartfree.com/es/obras/${slug}`,
      `https://fineartfree.com/pt/obras/${slug}`,
    ])

    if (newUrls.length > 0) {
      await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: 'fineartfree.com',
          key: process.env.INDEXNOW_KEY,
          keyLocation: 'https://fineartfree.com/faf-indexnow-2026-xK9mP3qR.txt',
          urlList: newUrls
        })
      })
    }
  } catch (e) {
    // Non-critical, ignore errors
  }

  // Warm up page cache for newly inserted artworks
  // so Google hits a fast cached page instead of cold render
  try {
    const warmupPromises = insertedSlugs.flatMap((slug: string) => [
      fetch(`https://fineartfree.com/artworks/${slug}`, { method: 'GET' }),
      fetch(`https://fineartfree.com/es/obras/${slug}`, { method: 'GET' }),
      fetch(`https://fineartfree.com/pt/obras/${slug}`, { method: 'GET' }),
    ])
    // Don't await - fire and forget, runs in background
    Promise.all(warmupPromises).catch(() => {})
  } catch (e) {
    // Non-critical, ignore errors
  }

  return NextResponse.json(
    {
      message: `Done: ${results.inserted} inserted, ${results.skipped} skipped`,
      ...results,
      errorDetails: results.errors,
    },
    { headers: corsHeaders }
  );
}
