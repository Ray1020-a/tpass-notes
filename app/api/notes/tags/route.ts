import { NextResponse } from "next/server";
import { getSession, isModerator } from "@/lib/auth";
import { initDb, query } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 401 });

  const body = await request.json();
  const noteId = Number(body?.noteId);
  const tagNames = Array.isArray(body?.tags) ? body.tags.filter(Boolean).map(String) : [];

  if (!Number.isInteger(noteId)) return NextResponse.json({ error: "invalid noteId" }, { status: 400 });

  await initDb();

  const noteResult = await query<{ owner_email: string; owner_sub: string }>(
    `SELECT owner_email, owner_sub FROM notes WHERE id = $1`, [noteId]
  );
  if (noteResult.rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  const note = noteResult.rows[0];
  const isOwner = session.sub === note.owner_sub || session.email === note.owner_email;
  if (!isModerator(session) || !isOwner) {
    const collabRes = await query<{ email: string }>(
      `SELECT email FROM note_collaborators WHERE note_id = $1 AND email = $2`, [noteId, session.email]
    );
    if (collabRes.rows.length === 0) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  await query(`DELETE FROM note_tags WHERE note_id = $1`, [noteId]);

  for (const tagName of tagNames) {
    const existing = await query<{ id: number }>(`SELECT id FROM tags WHERE name = $1`, [tagName]);
    let tagId = existing.rows[0]?.id;
    if (!tagId) {
      const insertTag = await query<{ id: number }>(
        `INSERT INTO tags (name) VALUES ($1) RETURNING id`, [tagName]
      );
      tagId = insertTag.rows[0].id;
    }
    await query(`INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [noteId, tagId]);
  }

  return NextResponse.json({ ok: true });
}
