import { redirect } from "next/navigation";
import { PanelClient } from "@/components/panel-client";
import { canManage, getPermissionEntry, getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type NoteRow = {
  id: number;
  title: string;
  owner_name: string;
  owner_email: string;
  updated_at: string;
  created_at: string;
  published: boolean;
  content_type: string;
  latest_content?: string;
};

export default async function PanelPage() {
  const session = await getSession();
  const permission = getPermissionEntry(session);
  if (!session || !canManage(session)) {
    redirect("/api/auth/login?next=/panel");
  }

  const notesRes = await query<NoteRow>(`
    SELECT id, title, owner_name, owner_email, updated_at, created_at, published, content_type, latest_content
    FROM notes
    ORDER BY updated_at DESC
  `);

  const initialStats = {
    total: notesRes.rows.filter((note: NoteRow) => note.published).length,
    yourNotes: notesRes.rows.filter((note: NoteRow) => note.owner_email === session.email).length,
    publishedByYou: notesRes.rows.filter((note: NoteRow) => note.owner_email === session.email && note.published).length,
    unpublishedByYou: notesRes.rows.filter((note: NoteRow) => note.owner_email === session.email && !note.published).length,
  };

  return (
    <PanelClient
      initialNotes={notesRes.rows}
      initialStats={initialStats}
      isAdmin={permission.role === "admin"}
    />
  );
}
