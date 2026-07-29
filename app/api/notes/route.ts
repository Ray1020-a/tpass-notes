import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initDb, query } from "@/lib/db";

type FlatNoteRow = {
  id: number;
  title: string;
  owner_name: string;
  owner_email: string;
  updated_at: string;
  created_at: string;
  published: boolean;
  content_type: string;
  latest_content?: string;
  file_size?: number;
};

type InsertNoteRow = {
  id: number;
};

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";

  await initDb();
  const result = await query<FlatNoteRow>(`
    SELECT n.id, n.title, n.owner_name, n.owner_email, n.updated_at, n.created_at, n.published, n.content_type, n.latest_content
    FROM notes n
    ORDER BY n.updated_at DESC
  `);

  const filtered = result.rows.filter((note: FlatNoteRow) => {
    return !q || `${note.title} ${note.owner_name}`.toLowerCase().includes(q.toLowerCase());
  });

  const stats = {
    total: result.rows.filter((note: FlatNoteRow) => note.published).length,
    yourNotes: result.rows.filter((note: FlatNoteRow) => note.owner_email === session.email).length,
    publishedByYou: result.rows.filter((note: FlatNoteRow) => note.owner_email === session.email && note.published).length,
    unpublishedByYou: result.rows.filter((note: FlatNoteRow) => note.owner_email === session.email && !note.published).length,
  };

  return NextResponse.json({ notes: filtered, tags: [], stats });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 401 });

  const body = await request.json();
  const title = String(body?.title || "").trim();
  const contentType = String(body?.contentType || "markdown");

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  await initDb();
  const noteResult = await query<InsertNoteRow>(
    `INSERT INTO notes (title, content_type, owner_email, owner_name, published, latest_content) VALUES ($1, $2, $3, $4, true, '') RETURNING id`,
    [title, contentType, session.email, session.name]
  );
  const noteId = noteResult.rows[0].id;

  return NextResponse.json({ ok: true, id: noteId });
}
