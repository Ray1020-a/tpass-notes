import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initDb, query } from "@/lib/db";

type NoteRow = {
  id: number;
  title: string;
  owner_name: string;
  owner_email: string;
  updated_at: string;
  created_at: string;
  published: boolean;
  content_type: string;
  tags: string;
  latest_content?: string;
  file_size?: number;
};

type TagRow = {
  name: string;
};

type InsertNoteRow = {
  id: number;
};

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const selectedTags = url.searchParams.getAll("tags");

  await initDb();
  const result = await query<NoteRow>(`
    SELECT n.id, n.title, n.owner_name, n.owner_email, n.updated_at, n.created_at,
           n.published, n.content_type, n.latest_content,
           COALESCE(string_agg(t.name, ',') FILTER (WHERE t.name IS NOT NULL), '') AS tags
    FROM notes n
    LEFT JOIN note_tags nt ON nt.note_id = n.id
    LEFT JOIN tags t ON t.id = nt.tag_id
    GROUP BY n.id, n.title, n.owner_name, n.owner_email, n.updated_at, n.created_at, n.published, n.content_type, n.latest_content
    ORDER BY n.updated_at DESC
  `);

  const filtered = result.rows.filter((note: NoteRow) => {
    const noteTags = note.tags ? note.tags.split(",") : [];
    const matchesQuery = !q || `${note.title} ${note.owner_name}`.toLowerCase().includes(q.toLowerCase());
    const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => noteTags.includes(tag));
    return matchesQuery && matchesTags;
  });

  const tagsResult = await query<TagRow>(`SELECT name FROM tags ORDER BY name`);

  const stats = {
    total: result.rows.filter((note: NoteRow) => note.published).length,
    yourNotes: result.rows.filter((note: NoteRow) => note.owner_email === session.email).length,
    publishedByYou: result.rows.filter((note: NoteRow) => note.owner_email === session.email && note.published).length,
    unpublishedByYou: result.rows.filter((note: NoteRow) => note.owner_email === session.email && !note.published).length,
  };

  return NextResponse.json({
    notes: filtered,
    tags: tagsResult.rows.map((row: TagRow) => row.name),
    stats,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "forbidden" }, { status: 401 });

  const body = await request.json();
  const title = String(body?.title || "").trim();
  const contentType = String(body?.contentType || "markdown");
  const tagNames = Array.isArray(body?.tags) ? body.tags.filter(Boolean).map(String) : [];

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  await initDb();
  const noteResult = await query<InsertNoteRow>(
    `INSERT INTO notes (title, content_type, owner_email, owner_name, published, latest_content) VALUES ($1, $2, $3, $4, true, '') RETURNING id`,
    [title, contentType, session.email, session.name]
  );
  const noteId = noteResult.rows[0].id;

  for (const tagName of tagNames) {
    const existing = await query<{ id: number }>(`SELECT id FROM tags WHERE name = $1`, [tagName]);
    let tagId = existing.rows[0]?.id;
    if (!tagId) {
      const insertTag = await query<InsertNoteRow>(
        `INSERT INTO tags (name) VALUES ($1) RETURNING id`, [tagName]
      );
      tagId = insertTag.rows[0].id;
    }
    await query(`INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [noteId, tagId]);
  }

  return NextResponse.json({ ok: true, id: noteId });
}
