import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { getSession, isAdmin } from "@/lib/auth";
import { initDb, query } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 401 });

  const { id } = await params;
  const noteId = Number(id);
  if (!Number.isInteger(noteId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  await initDb();
  const noteResult = await query<{ owner_email: string; owner_sub: string }>(`SELECT owner_email, owner_sub FROM notes WHERE id = $1`, [noteId]);
  if (noteResult.rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  const note = noteResult.rows[0];
  const isOwner = session.sub === note.owner_sub || session.email === note.owner_email;
  const collabRes = await query<{ email: string }>(`SELECT email FROM note_collaborators WHERE note_id = $1 AND email = $2`, [noteId, session.email]);
  const isCollab = collabRes.rows.length > 0;

  if (!isAdmin(session) && !isOwner && !isCollab) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const published = body?.published;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const collaborators = Array.isArray(body?.collaborators)
    ? body.collaborators
        .map((item: unknown) => {
          if (typeof item === "string") return { email: item.trim(), name: "" };
          if (item && typeof item === "object") {
            const candidate = item as { email?: unknown; name?: unknown };
            return {
              email: typeof candidate.email === "string" ? candidate.email.trim() : "",
              name: typeof candidate.name === "string" ? candidate.name.trim() : "",
            };
          }
          return { email: "", name: "" };
        })
        .filter((item: { email: string }) => item.email)
    : null;

  if (typeof published === "boolean") {
    await query(`UPDATE notes SET published = $1, updated_at = NOW() WHERE id = $2`, [published, noteId]);
  }

  if (title) {
    await query(`UPDATE notes SET title = $1, updated_at = NOW() WHERE id = $2`, [title, noteId]);
  }

  if (collaborators !== null) {
    await query(`DELETE FROM note_collaborators WHERE note_id = $1`, [noteId]);
    for (const collaborator of collaborators) {
      await query(`INSERT INTO note_collaborators (note_id, email, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [noteId, collaborator.email, collaborator.name]);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 401 });

  const { id } = await params;
  const noteId = Number(id);
  if (!Number.isInteger(noteId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  await initDb();

  const noteResult = await query<{ owner_email: string; owner_sub: string; published: boolean; content_type: string }>(
    `SELECT owner_email, owner_sub, published, content_type FROM notes WHERE id = $1`, [noteId]
  );
  if (noteResult.rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  const note = noteResult.rows[0];
  const isOwner = session.sub === note.owner_sub || session.email === note.owner_email;

  if (!isAdmin(session) && !isOwner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (note.published) {
    return NextResponse.json({ error: "must unpublish first" }, { status: 400 });
  }

  const filePaths = await query<{ file_path: string }>(
    `SELECT file_path FROM note_versions WHERE note_id = $1 AND file_path IS NOT NULL`, [noteId]
  );

  for (const row of filePaths.rows) {
    const safePath = row.file_path.replace(/^\/+/, "");
    const absPath = path.join(process.cwd(), safePath);
    try { await unlink(absPath); } catch {}
  }

  await query(`DELETE FROM note_collaborators WHERE note_id = $1`, [noteId]);
  await query(`DELETE FROM note_tags WHERE note_id = $1`, [noteId]);
  await query(`DELETE FROM note_versions WHERE note_id = $1`, [noteId]);
  await query(`DELETE FROM notes WHERE id = $1`, [noteId]);

  return NextResponse.json({ ok: true });
}
