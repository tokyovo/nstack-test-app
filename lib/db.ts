import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { applySchema } from "@/lib/schema";

let db: Database.Database | undefined;

/** Opens the SQLite file at DATABASE_PATH (default ./data/app.db), creating the schema on first open. */
export function getDb(): Database.Database {
  if (!db) {
    const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "app.db");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    db = new Database(file);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    applySchema(db);
  }
  return db;
}
