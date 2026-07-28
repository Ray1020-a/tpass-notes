import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initDb, query } from "@/lib/db";

export async function GET() {
  await initDb();
  const result = await query<any>(`SELECT id, title, owner_name, updated_at, published FROM notes ORDER BY updated_at DESC`);
  return NextResponse.json(result.rows);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 401 });

  const body = await request.json();
  const title = String(body?.title || "").trim();
  const contentType = String(body?.contentType || "markdown");
  const tagNames = Array.isArray(body?.tags) ? body.tags.filter(Boolean).map(String) : [];

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  await initDb();
  const noteResult = await query<any>(`INSERT INTO notes (title, content_type, owner_email, owner_name, published, latest_content) VALUES ($1, $2, $3, $4, true, '') RETURNING id`, [title, contentType, session.email, session.name]);
  const noteId = noteResult.rows[0].id;

  for (const tagName of tagNames) {
    const existing = await query<any>(`SELECT id FROM tags WHERE name = $1`, [tagName]);
    let tagId = existing.rows[0]?.id;
    if (!tagId) {
      const insertTag = await query<any>(`INSERT INTO tags (name) VALUES ($1) RETURNING id`, [tagName]);
      tagId = insertTag.rows[0].id;
    }
    await query(`INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [noteId, tagId]);
  }

  return NextResponse.json({ ok: true, id: noteId });
}
