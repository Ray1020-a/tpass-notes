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
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const collaborators = Array.isArray(body?.collaborators)
    ? body.collaborators
        .map((item: unknown) => {
          if (typeof item === "string") {
            return { email: item.trim(), name: "" };
          }
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

  await initDb();

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
