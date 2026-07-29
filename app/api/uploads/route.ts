import { NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import { getSession, isAdmin, isModerator } from "@/lib/auth";
import { initDb, query } from "@/lib/db";

export const runtime = "nodejs";

function isValidPdf(buffer: Buffer): boolean {
  return buffer.slice(0, 5).toString() === "%PDF-";
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const noteId = Number(formData.get("noteId"));
  if (!file || !Number.isInteger(noteId)) return NextResponse.json({ error: "invalid upload" }, { status: 400 });

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "檔案過大，限制 20 MB" }, { status: 413 });
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "僅接受 PDF 檔案" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  if (!isValidPdf(bytes)) {
    return NextResponse.json({ error: "無效的 PDF 檔案" }, { status: 400 });
  }

  await initDb();

  const noteResult = await query<{ owner_email: string; owner_sub: string; published: boolean }>(
    `SELECT owner_email, owner_sub, published FROM notes WHERE id = $1`, [noteId]
  );
  if (noteResult.rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  const note = noteResult.rows[0];
  const isOwner = session.sub === note.owner_sub || session.email === note.owner_email;
  const collabRes = await query<{ email: string }>(
    `SELECT email FROM note_collaborators WHERE note_id = $1 AND email = $2`, [noteId, session.email]
  );
  const isCollab = collabRes.rows.length > 0;

  if (!isAdmin(session) && !isModerator(session) && !isOwner && !isCollab) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const safeNameBase = path.parse(file.name).name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const safeName = `${Date.now()}-${safeNameBase}.pdf`;
  const destDir = path.join(process.cwd(), "public", "uploads");
  const destPath = path.join(destDir, safeName);

  await writeFile(destPath, bytes);

  try {
    const versionResult = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM note_versions WHERE note_id = $1`, [noteId]
    );
    const version = versionResult.rows[0].count + 1;

    await query(`
      INSERT INTO note_versions (note_id, version_number, file_path, file_size, mime_type, created_by_email, created_by_name, created_by_sub)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [noteId, version, `/uploads/${safeName}`, file.size, "application/pdf", session.email, session.name, session.sub]);

    await query(`UPDATE notes SET content_type = 'pdf', updated_at = NOW() WHERE id = $1`, [noteId]);

    return NextResponse.json({ ok: true, path: `/uploads/${safeName}` });
  } catch {
    try { await unlink(destPath); } catch {}
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
}
