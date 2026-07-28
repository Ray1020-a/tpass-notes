import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initDb, query } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 401 });
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  await initDb();
  const result = await query<any>(`SELECT latest_content FROM notes WHERE id = $1`, [id]);
  if (result.rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ content: result.rows[0].latest_content || "" });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 401 });

  const body = await request.json();
  const id = Number(body?.id);
  const content = String(body?.content || "");

  if (!Number.isInteger(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  await initDb();
  const noteResult = await query<any>(`SELECT id FROM notes WHERE id = $1`, [id]);
  if (noteResult.rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  const versionResult = await query<any>(`SELECT COUNT(*)::int AS count FROM note_versions WHERE note_id = $1`, [id]);
  const nextVersion = versionResult.rows[0].count + 1;
  await query(`
    INSERT INTO note_versions (note_id, version_number, content, created_by_email, created_by_name)
    VALUES ($1, $2, $3, $4, $5)
  `, [id, nextVersion, content, session.email, session.name]);
  await query(`UPDATE notes SET latest_content = $1, updated_at = NOW() WHERE id = $2`, [content, id]);

  return NextResponse.json({ ok: true, version: nextVersion });
}
