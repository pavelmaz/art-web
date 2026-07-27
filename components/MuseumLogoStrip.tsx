import Link from "next/link";

import { MUSEUM_LOGOS } from "@/lib/museum-logos";

// The homepage strip stays curated to the original 8 clean single-line wordmarks;
// the museums grid uses the full MUSEUM_LOGOS list.
const STRIP_LOGOS = MUSEUM_LOGOS.slice(0, 8);

/** Continuously scrolling row of museum wordmarks, each linking to its hub.
 *  Starts mid-strip so all logos are visible on load; pauses on hover. */
export function MuseumLogoStrip({ label = "Sourced from the world's great museums" }: { label?: string }) {
  return (
    <div>
      <p className="mb-4 text-[11px] uppercase tracking-[0.1em] text-white/40">{label}</p>
      <div className="pd-marquee">
        <div className="pd-marquee-track items-center" style={{ animationDelay: "-30s" }}>
          {[...STRIP_LOGOS, ...STRIP_LOGOS].map((m, i) => (
            <Link
              key={`${m.slug}-${i}`}
              href={`/museums/${m.slug}`}
              className="flex h-10 w-[150px] shrink-0 items-center justify-center opacity-55 transition-opacity hover:opacity-90"
              aria-label={m.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/images/museum-logos/${m.file}`}
                alt={m.name}
                className="max-h-[26px] w-auto max-w-full object-contain"
                loading="eager"
                decoding="async"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
