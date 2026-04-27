import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve(__dirname, "../../data/receipts.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      ai_extraction TEXT NOT NULL,
      corrected_data TEXT NOT NULL,
      image_path TEXT NOT NULL
    );
  `);
}
