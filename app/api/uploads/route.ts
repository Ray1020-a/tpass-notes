import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";
import { initDb, query } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const noteId = Number(formData.get("noteId"));
  if (!file || !Number.isInteger(noteId)) return NextResponse.json({ error: "invalid upload" }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "file too large" }, { status: 413 });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const destPath = path.join(process.cwd(), "public", "uploads", `${Date.now()}-${safeName}`);

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(destPath, bytes);
  await initDb();
  const versionResult = await query<any>(`SELECT COUNT(*)::int AS count FROM note_versions WHERE note_id = $1`, [noteId]);
  const version = versionResult.rows[0].count + 1;
  await query(`
    INSERT INTO note_versions (note_id, version_number, file_path, file_size, mime_type, created_by_email, created_by_name)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [noteId, version, `/uploads/${path.basename(destPath)}`, file.size, file.type || "application/pdf", session.email, session.name]);
  await query(`UPDATE notes SET content_type = 'pdf', updated_at = NOW() WHERE id = $2`, [noteId]);
  return NextResponse.json({ ok: true, path: `/uploads/${path.basename(destPath)}` });
}
