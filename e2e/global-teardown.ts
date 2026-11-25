import { rmSync } from "node:fs";

// Removes the temp SQLite file playwright.config.ts generated for this run,
// with its WAL and shared-memory files. A path the caller set is left alone.
export default function globalTeardown() {
  const dbPath = process.env.E2E_DATABASE_PATH;
  if (process.env.E2E_DB_GENERATED !== "1" || !dbPath) return;
  for (const suffix of ["", "-wal", "-shm"]) rmSync(dbPath + suffix, { force: true });
}
