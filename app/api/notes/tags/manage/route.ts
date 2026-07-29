import { NextResponse } from "next/server";
import { getSession, isModerator } from "@/lib/auth";
import { initDb, query } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isModerator(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const name = String(body?.name || "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  await initDb();
  const existing = await query<{ id: number }>(`SELECT id FROM tags WHERE name = $1`, [name]);
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "tag already exists" }, { status: 409 });
  }

  await query(`INSERT INTO tags (name) VALUES ($1)`, [name]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || !isModerator(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const name = String(body?.name || "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  await initDb();

  const inUse = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE t.name = $1`, [name]
  );
  if (inUse.rows[0].count > 0) {
    return NextResponse.json({
      error: "in use",
      reason: `該標籤已被 ${inUse.rows[0].count} 篇筆記使用，無法移除`,
    }, { status: 400 });
  }

  await query(`DELETE FROM tags WHERE name = $1`, [name]);
  return NextResponse.json({ ok: true });
}
