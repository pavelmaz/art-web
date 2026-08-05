import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Record the download against the signed-in user so it can be listed in
 * /account/downloads. Anonymous downloads are not logged — there is nobody to
 * show them to. Never throws: a logging failure must not cost the user a file.
 *
 * `downloads` is read-only under RLS (the owner may SELECT, nobody may INSERT),
 * so the write goes through the service key.
 */
async function logDownload(req: NextRequest, slug: string | null) {
  try {
    if (!slug) return;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    if (!serviceKey || !base) return;

    // The caller states which tier it is (the Standard and Max hrefs can point
    // at the same object, so the URL alone cannot tell them apart).
    const size = req.nextUrl.searchParams.get("size") === "max" ? "max" : "standard";

    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };
    const lookup = await fetch(
      `${base}/rest/v1/artworks?select=id&slug=eq.${encodeURIComponent(slug)}&limit=1`,
      { headers }
    );
    const rows = (await lookup.json()) as { id?: string }[];
    const artworkId = Array.isArray(rows) ? rows[0]?.id : undefined;
    if (!artworkId) return;

    await fetch(`${base}/rest/v1/downloads`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ user_id: user.id, artwork_id: artworkId, size }),
    });
  } catch {
    // Logging is best-effort; the download always wins.
  }
}

/**
 * Same-origin download proxy. A cross-origin `<a download>` (the image lives on
 * cdn.fineartfree.com) is ignored by browsers, so the file just opens instead of
 * downloading. This route fetches the image server-side and streams it back with
 * `Content-Disposition: attachment`, which forces a real download on desktop AND
 * mobile. Display images still load straight from the CDN — only the download click
 * comes through here.
 *
 * Host-allowlisted so it can't be abused as an open proxy.
 */
const ALLOWED_HOSTS = new Set(["cdn.fineartfree.com", "www.artic.edu", "upload.wikimedia.org"]);

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src");
  if (!src) return new NextResponse("Missing src", { status: 400 });

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return new NextResponse("Invalid src", { status: 400 });
  }
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const upstream = await fetch(url.toString());
  if (!upstream.ok || !upstream.body) {
    return new NextResponse("Upstream error", { status: 502 });
  }

  await logDownload(req, req.nextUrl.searchParams.get("name")?.trim() || null);

  let contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  let body: BodyInit = upstream.body;

  // Downloads should be universally openable: print shops, old design tools and
  // marketplaces all speak JPG, while WebP (our display/rendition format) still
  // trips some of them up. Convert WebP to JPG on the fly — display images keep
  // serving WebP straight from the CDN; only the download click pays this cost.
  if (contentType.includes("webp")) {
    try {
      const converted = await sharp(Buffer.from(await upstream.arrayBuffer()))
        .jpeg({ quality: 90 })
        .toBuffer();
      body = new Uint8Array(converted);
      contentType = "image/jpeg";
    } catch {
      // Conversion failed — serve the original WebP rather than no file.
    }
  }

  const ext = contentType.includes("webp")
    ? "webp"
    : contentType.includes("png")
      ? "png"
      : "jpg";

  const rawName = req.nextUrl.searchParams.get("name")?.trim();
  const base =
    (rawName && rawName.length ? rawName : url.pathname.split("/").pop() || "artwork")
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^\w.\- ]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "artwork";
  const filename = `${base}.${ext}`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
