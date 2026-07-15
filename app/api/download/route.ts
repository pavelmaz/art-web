import { NextRequest, NextResponse } from "next/server";

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
const ALLOWED_HOSTS = new Set(["cdn.fineartfree.com", "www.artic.edu"]);

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

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
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

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
