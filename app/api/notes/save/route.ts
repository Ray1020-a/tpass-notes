import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { getSession, isAdmin, isModerator } from "@/lib/auth";
import { initDb, query } from "@/lib/db";

type NoteRow = {
  id: number;
  title: string;
  content_type: string;
  published: boolean;
  latest_content: string;
  owner_email: string;
  owner_sub: string;
};

type VersionRow = {
  id: number;
  version_number: number;
  content: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
  created_by_name: string;
  created_by_email: string;
  created_by_sub: string;
};

type CollaboratorRow = {
  email: string;
  name: string;
};

async function getNoteWithCheck(id: number) {
  const noteResult = await query<NoteRow>(`SELECT * FROM notes WHERE id = $1`, [id]);
  if (noteResult.rows.length === 0) return null;
  return noteResult.rows[0];
}

function canEdit(session: Awaited<ReturnType<typeof getSession>>, note: { owner_email: string; owner_sub: string }, collaborators: string[]) {
  if (!session) return false;
  if (isAdmin(session)) return true;
  if (isModerator(session)) return true;
  const isOwner = session.sub === note.owner_sub || session.email === note.owner_email;
  const isCollab = collaborators.includes(session.email);
  return isOwner || isCollab;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 401 });

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  await initDb();
  const note = await getNoteWithCheck(id);
  if (!note) return NextResponse.json({ error: "not found" }, { status: 404 });

  const collabRes = await query<{ email: string }>(`SELECT email FROM note_collaborators WHERE note_id = $1`, [id]);
  const collabEmails = collabRes.rows.map((r) => r.email);

  if (!canEdit(session, note, collabEmails)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const versionsResult = await query<VersionRow>(`SELECT id, version_number, content, file_path, file_size, mime_type, created_at, created_by_name, created_by_email, created_by_sub FROM note_versions WHERE note_id = $1 ORDER BY version_number DESC, created_at DESC`, [id]);
  const collaboratorsResult = await query<CollaboratorRow>(`SELECT email, name FROM note_collaborators WHERE note_id = $1 ORDER BY name, email`, [id]);
  const noteTagsResult = await query<{ name: string }>(`SELECT t.name FROM tags t JOIN note_tags nt ON nt.tag_id = t.id WHERE nt.note_id = $1 ORDER BY t.name`, [id]);
  const allTagsResult = await query<{ name: string }>(`SELECT name FROM tags ORDER BY name`);

  return NextResponse.json({
    content: note.latest_content || "",
    title: note.title,
    contentType: note.content_type || "markdown",
    published: note.published,
    versions: versionsResult.rows,
    collaborators: collaboratorsResult.rows,
    tags: noteTagsResult.rows.map((r) => r.name),
    allTags: allTagsResult.rows.map((r) => r.name),
    sessionEmail: session.email,
    sessionSub: session.sub,
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
  const note = await getNoteWithCheck(id);
  if (!note) return NextResponse.json({ error: "not found" }, { status: 404 });

  const collabRes = await query<{ email: string }>(`SELECT email FROM note_collaborators WHERE note_id = $1`, [id]);
  const collabEmails = collabRes.rows.map((r) => r.email);

  if (!canEdit(session, note, collabEmails)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (Number.isInteger(restoreVersion) && restoreVersion > 0) {
    const versionResult = await query<{ content: string }>(`SELECT content FROM note_versions WHERE note_id = $1 AND version_number = $2`, [id, restoreVersion]);
    if (versionResult.rows.length > 0) {
      content = String(versionResult.rows[0].content ?? "");
    }
  }

  const updates: string[] = [];
  const values: unknown[] = [id];
  let idx = 2;

  if (title) {
    updates.push(`title = $${idx++}`);
    values.push(title);
  }
  if (contentType) {
    updates.push(`content_type = $${idx++}`);
    values.push(contentType);
  }
  if (published !== null) {
    updates.push(`published = $${idx++}`);
    values.push(published);
  }

  updates.push(`updated_at = NOW()`);

  if (updates.length > 0) {
    await query(`UPDATE notes SET ${updates.join(", ")} WHERE id = $1`, values);
  }

  if (content) {
    const versionResult = await query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM note_versions WHERE note_id = $1`, [id]);
    const nextVersion = versionResult.rows[0].count + 1;
    await query(`
      INSERT INTO note_versions (note_id, version_number, content, created_by_email, created_by_name, created_by_sub)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, nextVersion, content, session.email, session.name, session.sub]);
    await query(`UPDATE notes SET latest_content = $1, updated_at = NOW() WHERE id = $2`, [content, id]);
  }

  const versionsResult = await query<VersionRow>(`SELECT id, version_number, content, file_path, file_size, mime_type, created_at, created_by_name, created_by_email, created_by_sub FROM note_versions WHERE note_id = $1 ORDER BY version_number DESC, created_at DESC`, [id]);

  return NextResponse.json({
    ok: true,
    content,
    versions: versionsResult.rows,
    sessionEmail: session.email,
    sessionSub: session.sub,
  });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 401 });

  const body = await request.json();
  const id = Number(body?.id);
  const versionNumber = Number(body?.versionNumber);

  if (!Number.isInteger(id) || !Number.isInteger(versionNumber)) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  await initDb();
  const note = await getNoteWithCheck(id);
  if (!note) return NextResponse.json({ error: "not found" }, { status: 404 });

  const versionResult = await query<VersionRow>(`SELECT * FROM note_versions WHERE note_id = $1 AND version_number = $2`, [id, versionNumber]);
  if (versionResult.rows.length === 0) {
    return NextResponse.json({ error: "version not found" }, { status: 404 });
  }

  const version = versionResult.rows[0];

  const collabRes = await query<{ email: string }>(`SELECT email FROM note_collaborators WHERE note_id = $1`, [id]);
  const collabEmails = collabRes.rows.map((r) => r.email);

  if (isAdmin(session)) {
  } else if (isModerator(session)) {
    const isOwner = session.sub === note.owner_sub || session.email === note.owner_email;
    const isCollab = collabEmails.includes(session.email);
    const isVersionOwner = session.sub === version.created_by_sub || session.email === version.created_by_email;
    if (!(isOwner || (isCollab && isVersionOwner))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (version.file_path) {
    const safePath = version.file_path.replace(/^\/+/, "");
    const absPath = path.join(process.cwd(), "public", safePath);
    try { await unlink(absPath); } catch {}
  }

  await query(`DELETE FROM note_versions WHERE note_id = $1 AND version_number = $2`, [id, versionNumber]);

  return NextResponse.json({ ok: true });
}
