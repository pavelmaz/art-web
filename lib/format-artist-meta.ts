export function formatArtistMetaLine(
  nationality: string | null | undefined,
  birthYear: number | null | undefined,
  deathYear: number | null | undefined,
): string | null {
  const nation = nationality?.trim();
  const birth = typeof birthYear === "number" && Number.isFinite(birthYear) ? birthYear : null;
  const death = typeof deathYear === "number" && Number.isFinite(deathYear) ? deathYear : null;

  let years: string | null = null;
  if (birth != null && death != null) {
    years = `${birth}–${death}`;
  } else if (birth != null) {
    years = String(birth);
  } else if (death != null) {
    years = String(death);
  }

  if (nation && years) {
    return `${nation}, ${years}`;
  }
  return nation || years;
}
