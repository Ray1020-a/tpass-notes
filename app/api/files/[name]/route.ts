import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";
import { initDb, query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse(null, { status: 404 });

  const { name } = await params;
  const safeName = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safeName) return new NextResponse(null, { status: 404 });

  const filePath = path.join(process.cwd(), "public", "uploads", safeName);

  try {
    await initDb();
    const versionResult = await query<{ note_id: number }>(
      `SELECT note_id FROM note_versions WHERE file_path = $1`, [`/uploads/${safeName}`]
    );
    if (versionResult.rows.length === 0) return new NextResponse(null, { status: 404 });

    const noteId = versionResult.rows[0].note_id;
    const noteResult = await query<{ published: boolean }>(
      `SELECT published FROM notes WHERE id = $1`, [noteId]
    );
    if (noteResult.rows.length === 0) return new NextResponse(null, { status: 404 });

    const note = noteResult.rows[0];
    if (!note.published) {
      const ownerResult = await query<{ owner_email: string; owner_sub: string }>(
        `SELECT owner_email, owner_sub FROM notes WHERE id = $1`, [noteId]
      );
      const noteOwner = ownerResult.rows[0];
      const isOwner = session.sub === noteOwner.owner_sub || session.email === noteOwner.owner_email;
      if (!isOwner) {
        const collabRes = await query<{ email: string }>(
          `SELECT email FROM note_collaborators WHERE note_id = $1 AND email = $2`, [noteId, session.email]
        );
        if (collabRes.rows.length === 0) return new NextResponse(null, { status: 404 });
      }
    }

    const bytes = await readFile(filePath);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Content-Security-Policy": "sandbox",
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
