import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

/**
 * Detail crops for the download interstitial: the same region of an artwork at
 * the free download's effective resolution and at full resolution.
 *
 * Why a crop and not the whole painting: at modal size a 1400px file and a
 * 6000px file look identical. Only a 1:1 detail shows what the extra pixels buy
 * — the same reason the Pro hero uses crops rather than full works.
 *
 * Why the soft side is honest: it is the crop genuinely resampled down to the
 * pixels the 1400px file holds for that region, then scaled back up. No blur
 * filter — a blur would show a free file worse than the one we actually give.
 *
 * Cost control: the original is read from Supabase storage exactly ONCE per
 * artwork (median 1.83 MB), then both crops are written back as renditions and
 * every later request is served from the CDN. Reads go direct to storage with
 * the service key, never through the Cloudflare Worker.
 */

const BUCKET = "art-images";
const CROP_W = 760;
const CROP_H = 500;
const FREE_WIDTH = 1400; // what the free download actually delivers

function env() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  return base && key ? { base, key } : null;
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const e = env();
  if (!e) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const auth = { apikey: e.key, Authorization: `Bearer ${e.key}` };

  // Already generated? Serve the cached pair without touching the original.
  const cdn = "https://cdn.fineartfree.com";
  const paths = {
    free: `renditions/crop-free/artworks/${slug}.jpg`,
    pro: `renditions/crop-pro/artworks/${slug}.jpg`,
  };
  const cachedUrls = { free: `${cdn}/storage/v1/object/public/${BUCKET}/${paths.free}`, pro: `${cdn}/storage/v1/object/public/${BUCKET}/${paths.pro}` };

  const head = await fetch(cachedUrls.pro, { method: "HEAD" });
  if (head.ok) {
    return NextResponse.json(cachedUrls, {
      headers: { "Cache-Control": "public, max-age=604800" },
    });
  }

  // Look up the original and its true width.
  const lookup = await fetch(
    `${e.base}/rest/v1/artworks?select=image_id,img_width,img_height&slug=eq.${encodeURIComponent(slug)}&limit=1`,
    { headers: auth }
  );
  const rows = (await lookup.json()) as { image_id?: string; img_width?: number; img_height?: number }[];
  const row = Array.isArray(rows) ? rows[0] : undefined;
  if (!row?.image_id || !row.img_width || row.img_width <= FREE_WIDTH) {
    return NextResponse.json({ error: "No larger version" }, { status: 404 });
  }

  const objectPath = row.image_id.match(/\/art-images\/(artworks\/[^?]+)/)?.[1];
  if (!objectPath) return NextResponse.json({ error: "Not a stored original" }, { status: 404 });

  try {
    // The one and only read of the original.
    const orig = await fetch(`${e.base}/storage/v1/object/${BUCKET}/${objectPath}`, { headers: auth });
    if (!orig.ok) return NextResponse.json({ error: "Original unavailable" }, { status: 502 });
    const buf = Buffer.from(await orig.arrayBuffer());

    const img = sharp(buf, { limitInputPixels: false }).rotate();
    const meta = await img.metadata();
    const w = meta.width ?? row.img_width;
    const h = meta.height ?? row.img_height ?? row.img_width;

    // Centre region, clamped to the image.
    const cw = Math.min(CROP_W, w);
    const ch = Math.min(CROP_H, h);
    const left = Math.max(0, Math.round((w - cw) / 2));
    const top = Math.max(0, Math.round((h - ch) / 2));
    const region = { left, top, width: cw, height: ch };

    const proBuf = await sharp(buf, { limitInputPixels: false })
      .rotate().extract(region).jpeg({ quality: 88 }).toBuffer();

    // The free file holds (1400 / originalWidth) of the linear resolution, so
    // the same region survives at that fraction. Resample down, then back up.
    const ratio = FREE_WIDTH / w;
    const softWidth = Math.max(8, Math.round(cw * ratio));
    const freeBuf = await sharp(proBuf)
      .resize({ width: softWidth })
      .toBuffer()
      .then((small) =>
        sharp(small).resize({ width: cw, height: ch, kernel: "cubic" }).jpeg({ quality: 86 }).toBuffer()
      );

    await Promise.all(
      ([["pro", proBuf], ["free", freeBuf]] as const).map(([k, body]) =>
        fetch(`${e.base}/storage/v1/object/${BUCKET}/${paths[k]}`, {
          method: "POST",
          headers: { ...auth, "Content-Type": "image/jpeg", "x-upsert": "true" },
          body: new Uint8Array(body),
        })
      )
    );

    return NextResponse.json(cachedUrls, {
      headers: { "Cache-Control": "public, max-age=604800" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Crop failed" },
      { status: 500 }
    );
  }
}
