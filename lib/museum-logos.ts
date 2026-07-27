/** White museum wordmarks (from Wikimedia Commons) keyed to their hub slug. */
export type MuseumLogo = { file: string; name: string; slug: string };

export const MUSEUM_LOGOS: MuseumLogo[] = [
  { file: "rijksmuseum.png", name: "Rijksmuseum", slug: "rijksmuseum" },
  { file: "prado.png", name: "Museo del Prado", slug: "museo-del-prado" },
  { file: "national-gallery.png", name: "The National Gallery", slug: "national-gallery-london" },
  { file: "british-museum.png", name: "The British Museum", slug: "british-museum" },
  { file: "mauritshuis.png", name: "Mauritshuis", slug: "mauritshuis" },
  { file: "uffizi.png", name: "Uffizi Gallery", slug: "uffizi-gallery" },
  { file: "the-met.png", name: "The Metropolitan Museum of Art", slug: "metropolitan-museum-of-art" },
  { file: "art-institute-chicago.png", name: "Art Institute of Chicago", slug: "art-institute-of-chicago" },
  { file: "musee-dorsay.png", name: "Musée d'Orsay", slug: "musee-dorsay" },
  { file: "museum-of-fine-arts-boston.png", name: "Museum of Fine Arts Boston", slug: "museum-of-fine-arts-boston" },
  { file: "national-gallery-of-art-washington.png", name: "National Gallery of Art", slug: "national-gallery-of-art-washington" },
  { file: "louvre-museum.png", name: "Louvre", slug: "louvre-museum" },
  { file: "guggenheim-museum.png", name: "Guggenheim Museum", slug: "guggenheim-museum" },
  { file: "kunsthistorisches-museum.png", name: "Kunsthistorisches Museum", slug: "kunsthistorisches-museum" },
  { file: "albertina-museum.png", name: "Albertina", slug: "albertina-museum" },
  { file: "belvedere-museum.png", name: "Belvedere", slug: "belvedere-museum" },
];

const BY_SLUG = new Map(MUSEUM_LOGOS.map((m) => [m.slug, m.file]));

/** Public path to a museum's white logo, or null if we don't have one. */
export function museumLogoSrc(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const file = BY_SLUG.get(slug);
  return file ? `/images/museum-logos/${file}` : null;
}
