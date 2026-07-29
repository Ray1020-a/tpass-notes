import { mkdir } from "fs/promises";
import path from "path";
import { Pool } from "pg";

interface DbQueryResult<T> {
  rows: T[];
  rowCount: number;
}

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || "postgresql://postgres:postgres@127.0.0.1:5432/t_notes",
});

let initialized = false;

export async function initDb() {
  if (initialized) return;
  initialized = true;

  await mkdir(path.join(process.cwd(), "public", "uploads"), { recursive: true });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS note_tags (
      note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (note_id, tag_id)
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

  const noteCount = await pool.query(`SELECT COUNT(*)::int AS count FROM notes`);
  if (noteCount.rows[0].count === 0) {
    const inserted = await pool.query(`
      INSERT INTO notes (title, content_type, owner_email, owner_name, published, latest_content)
      VALUES ('數學補充筆記', 'markdown', '11454@tschool.tp.edu.tw', '王大貴', true, '# 數學補充筆記\n\n- 這是一份示範筆記\n- 可以在管理面板中編輯與版本化')
      RETURNING id;
    `);
    const noteId = inserted.rows[0].id as number;
    await pool.query(`
      INSERT INTO note_versions (note_id, version_number, content, created_by_email, created_by_name)
      VALUES ($1, 1, $2, $3, $4)
    `, [noteId, '# 數學補充筆記\n\n- 這是一份示範筆記\n- 可以在管理面板中編輯與版本化', '11454@tschool.tp.edu.tw', '王大貴']);
  }
}

export async function query<T = Record<string, unknown>>(text: string, params?: unknown[]) {
  await initDb();
  const result = await pool.query(text, params);
  return result as DbQueryResult<T>;
}

export { pool };
