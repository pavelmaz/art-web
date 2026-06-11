/** Parse death_year from an artwork row (same coercion as the former artists-table lookup). */
export function parseArtworkDeathYear(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}
