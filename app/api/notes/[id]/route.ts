import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initDb, query } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 401 });

  const { id } = await params;
  const noteId = Number(id);
  if (!Number.isInteger(noteId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const body = await request.json();
  const published = body?.published;
  if (typeof published !== "boolean") return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  await initDb();
  await query(`UPDATE notes SET published = $1, updated_at = NOW() WHERE id = $2`, [published, noteId]);
  return NextResponse.json({ ok: true });
}
