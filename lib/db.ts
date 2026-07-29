import { mkdir } from "fs/promises";
import path from "path";
import { Pool } from "pg";

interface DbQueryResult<T> {
  rows: T[];
  rowCount: number;
}

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || "postgresql://t_notes:password@127.0.0.1:5432/t_notes",
});

pool.on("connect", (client) => {
  client.query("SET timezone TO 'Asia/Taipei'").catch(() => {});
});

let initialized = false;

export async function initDb() {
  if (initialized) return;
  initialized = true;

  await mkdir(path.join(process.cwd(), "uploads"), { recursive: true });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'markdown',
      owner_email TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      owner_sub TEXT DEFAULT '',
      published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      latest_content TEXT DEFAULT ''
    );
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS owner_sub TEXT DEFAULT '';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS note_tags (
      note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (note_id, tag_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS note_versions (
      id SERIAL PRIMARY KEY,
      note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      content TEXT DEFAULT '',
      file_path TEXT,
      file_size BIGINT DEFAULT 0,
      mime_type TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      created_by_email TEXT NOT NULL,
      created_by_name TEXT NOT NULL,
      created_by_sub TEXT DEFAULT ''
    );
    ALTER TABLE note_versions ADD COLUMN IF NOT EXISTS created_by_sub TEXT DEFAULT '';
    ALTER TABLE note_versions ADD COLUMN IF NOT EXISTS created_by_email TEXT DEFAULT '';
    ALTER TABLE note_versions ADD COLUMN IF NOT EXISTS created_by_name TEXT DEFAULT '';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS note_collaborators (
      note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (note_id, email)
    );
  `);
}

export async function query<T = Record<string, unknown>>(text: string, params?: unknown[]) {
  await initDb();
  const result = await pool.query(text, params);
  return result as DbQueryResult<T>;
}

export { pool };
