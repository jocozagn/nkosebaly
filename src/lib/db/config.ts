/** Active PostgreSQL comme backend de données (remplace store.json). */
export const isPostgresEnabled = (): boolean =>
  process.env.DATA_STORE === "postgres" && Boolean(process.env.DATABASE_URL?.trim());

/** URL de connexion PostgreSQL */
export const getDatabaseUrl = (): string | null => {
  const url = process.env.DATABASE_URL?.trim();
  return url || null;
};
