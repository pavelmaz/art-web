import { supabase } from "@/lib/supabase";
import { artworkGridImageUrl } from "@/lib/utils";

/**
 * Slow, seamlessly-looping strip of masterpieces for the top of the Pro join
 * page: this is an art site, so the checkout should *look* like one — but the
 * strip stays decorative (no links, no captions) so nothing competes with the
 * single call to action below it.
 *
 * `leadSlug` (the artwork the visitor came from) is pinned first when given.
 */
type ProArtStripProps = {
  leadSlug?: string | null;
};

const STRIP_COUNT = 14;

export async function ProArtStrip({ leadSlug }: ProArtStripProps) {
  let images: string[] = [];

  try {
    // High-scoring, hi-res works make the best impression at small sizes.
    const { data } = await supabase
      .from("daily_artworks")
      .select("slug, image_id, url")
      .order("score", { ascending: false })
      .limit(STRIP_COUNT * 2);

    const rows = data ?? [];
    const lead = leadSlug ? rows.find((r) => r.slug === leadSlug) : null;

    // Pin the visitor's artwork first when it happens to be in the set; otherwise
    // fetch it directly so it still leads the strip.
    let leadRow = lead ?? null;
    if (leadSlug && !leadRow && /^[a-z0-9-]{1,100}$/.test(leadSlug)) {
      const { data: one } = await supabase
        .from("artworks")
        .select("slug, image_id, url")
        .eq("slug", leadSlug)
        .limit(1);
      leadRow = one?.[0] ?? null;
    }

    const ordered = [
      ...(leadRow ? [leadRow] : []),
      ...rows.filter((r) => r.slug !== leadRow?.slug),
    ].slice(0, STRIP_COUNT);

    images = ordered
      .map((r) => artworkGridImageUrl({ url: r.url ?? null, image_id: r.image_id }))
      .filter((u): u is string => Boolean(u));
  } catch {
    images = [];
  }

  if (images.length < 4) return null;

  return (
    <div
      className="fap-marquee-mask border-y border-[#e8e6e1] bg-[#efece4] py-3"
      aria-hidden
    >
      {/* Rendered twice so the -50% translate loops without a seam. */}
      <div className="fap-artstrip-track">
        {[...images, ...images].map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${src}-${i}`}
            src={src}
            alt=""
            className="mr-3 h-24 w-auto rounded-lg object-cover shadow-[0_2px_10px_rgba(0,0,0,0.12)] sm:h-28"
            loading={i < 6 ? "eager" : "lazy"}
          />
        ))}
      </div>
    </div>
  );
}
