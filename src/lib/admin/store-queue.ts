/**
 * File d'attente sérialisée pour les écritures store.json / PostgreSQL.
 * Évite les écrasements concurrents (read-modify-write en parallèle).
 */

let chain: Promise<unknown> = Promise.resolve();

/** Exécute une mutation store de façon exclusive (FIFO). */
export const runExclusiveStoreMutation = async <T>(job: () => Promise<T>): Promise<T> => {
  const run = chain.then(job, job);
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
};
