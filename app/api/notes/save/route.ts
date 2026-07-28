import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initDb, query } from "@/lib/db";

type NoteRow = {
  id: number;
  title: string;
  content_type: string;
  published: boolean;
  latest_content: string;
};

type VersionRow = {
  version_number: number;
  content: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
  created_by_name: string;
};

type CollaboratorRow = {
  email: string;
  name: string;
};

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 401 });

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  await initDb();
  const noteResult = await query<NoteRow>(`SELECT id, title, content_type, published, latest_content FROM notes WHERE id = $1`, [id]);
  if (noteResult.rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  const versionsResult = await query<VersionRow>(`SELECT version_number, content, file_path, file_size, mime_type, created_at, created_by_name FROM note_versions WHERE note_id = $1 ORDER BY version_number DESC, created_at DESC`, [id]);
  const collaboratorsResult = await query<CollaboratorRow>(`SELECT email, name FROM note_collaborators WHERE note_id = $1 ORDER BY name, email`, [id]);

  return NextResponse.json({
    content: noteResult.rows[0].latest_content || "",
    title: noteResult.rows[0].title,
    contentType: noteResult.rows[0].content_type || "markdown",
    published: noteResult.rows[0].published,
    versions: versionsResult.rows,
    collaborators: collaboratorsResult.rows,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 401 });

  const body = await request.json();
  const id = Number(body?.id);
  let content = String(body?.content ?? "");
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const restoreVersion = Number(body?.restoreVersion);
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";
  const published = typeof body?.published === "boolean" ? body.published : null;

  if (!Number.isInteger(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  await initDb();
  const noteResult = await query<NoteRow>(`SELECT id, title, content_type FROM notes WHERE id = $1`, [id]);
  if (noteResult.rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (Number.isInteger(restoreVersion) && restoreVersion > 0) {
    const versionResult = await query<{ content: string }>(`SELECT content FROM note_versions WHERE note_id = $1 AND version_number = $2`, [id, restoreVersion]);
    if (versionResult.rows.length > 0) {
      content = String(versionResult.rows[0].content ?? "");
    }
  }

  if (title) {
    await query(`UPDATE notes SET title = $1, updated_at = NOW() WHERE id = $2`, [title, id]);
  }

  if (contentType) {
    await query(`UPDATE notes SET content_type = $1, updated_at = NOW() WHERE id = $2`, [contentType, id]);
  }

  if (published !== null) {
    await query(`UPDATE notes SET published = $1, updated_at = NOW() WHERE id = $2`, [published, id]);
  }

  const versionResult = await query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM note_versions WHERE note_id = $1`, [id]);
  const nextVersion = versionResult.rows[0].count + 1;
  await query(`
    INSERT INTO note_versions (note_id, version_number, content, created_by_email, created_by_name)
    VALUES ($1, $2, $3, $4, $5)
  `, [id, nextVersion, content, session.email, session.name]);
  await query(`UPDATE notes SET latest_content = $1, updated_at = NOW() WHERE id = $2`, [content, id]);

  const versionsResult = await query<VersionRow>(`SELECT version_number, content, file_path, file_size, mime_type, created_at, created_by_name FROM note_versions WHERE note_id = $1 ORDER BY version_number DESC, created_at DESC`, [id]);

  return NextResponse.json({ ok: true, version: nextVersion, content, versions: versionsResult.rows });
}
