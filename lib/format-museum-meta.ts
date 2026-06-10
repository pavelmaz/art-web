export function formatMuseumMetaLine(
  city: string | null | undefined,
  country: string | null | undefined,
): string | null {
  const cityLabel = city?.trim();
  const countryLabel = country?.trim();

  if (cityLabel && countryLabel) {
    return `${cityLabel}, ${countryLabel}`;
  }

  return cityLabel || countryLabel || null;
}
