/** Normalise un code licence saisi manuellement (ex: NKO-AB12-XY34) */
export const normalizeLicenseCodeText = (raw: string): string | null => {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!/^NKO-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleaned)) return null;
  return cleaned;
};
