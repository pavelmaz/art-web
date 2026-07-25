import Link from "next/link";

/** Museum logos (white PNG, sourced from Wikimedia Commons) → their hub pages. */
const MUSEUM_LOGOS = [
  { file: "rijksmuseum.png", name: "Rijksmuseum", slug: "rijksmuseum" },
  { file: "prado.png", name: "Museo del Prado", slug: "museo-del-prado" },
  { file: "national-gallery.png", name: "The National Gallery", slug: "national-gallery-london" },
  { file: "british-museum.png", name: "The British Museum", slug: "british-museum" },
  { file: "mauritshuis.png", name: "Mauritshuis", slug: "mauritshuis" },
  { file: "uffizi.png", name: "Uffizi Gallery", slug: "uffizi-gallery" },
  { file: "the-met.png", name: "The Metropolitan Museum of Art", slug: "metropolitan-museum-of-art" },
  { file: "art-institute-chicago.png", name: "Art Institute of Chicago", slug: "art-institute-of-chicago" },
];

/** Continuously scrolling row of museum wordmarks, each linking to its hub.
 *  Starts mid-strip so all logos are visible on load; pauses on hover. */
export function MuseumLogoStrip({ label = "Sourced from the world's great museums" }: { label?: string }) {
  return (
    <div>
      <p className="mb-4 text-[11px] uppercase tracking-[0.1em] text-white/40">{label}</p>
      <div className="pd-marquee">
        <div className="pd-marquee-track items-center" style={{ animationDelay: "-30s" }}>
          {[...MUSEUM_LOGOS, ...MUSEUM_LOGOS].map((m, i) => (
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
