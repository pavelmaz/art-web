export function safeString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

export function safeTrim(value: unknown): string {
  return safeString(value).trim();
}

export function safeNullableString(value: unknown): string | null {
  const trimmed = safeTrim(value);
  return trimmed || null;
}
