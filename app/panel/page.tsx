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
  tags: string;
  latest_content?: string;
  file_size?: number;
};

type TagRow = {
  name: string;
};

export default async function PanelPage() {
  const session = await getSession();
  const permission = getPermissionEntry(session);
  if (!session || !canManage(session)) {
    redirect("/api/auth/login?next=/panel");
  }

  const [notesRes, tagsRes] = await Promise.all([
    query<NoteRow>(`
      SELECT n.id, n.title, n.owner_name, n.owner_email, n.updated_at, n.created_at,
             n.published, n.content_type, n.latest_content,
             COALESCE(string_agg(t.name, ',') FILTER (WHERE t.name IS NOT NULL), '') AS tags,
             (SELECT file_size FROM note_versions WHERE note_id = n.id AND file_path IS NOT NULL ORDER BY version_number DESC LIMIT 1) AS file_size
      FROM notes n
      LEFT JOIN note_tags nt ON nt.note_id = n.id
      LEFT JOIN tags t ON t.id = nt.tag_id
      GROUP BY n.id, n.title, n.owner_name, n.owner_email, n.updated_at, n.created_at, n.published, n.content_type, n.latest_content
      ORDER BY n.updated_at DESC
    `),
    query<TagRow>(`SELECT name FROM tags ORDER BY name`),
  ]);

  const initialStats = {
    total: notesRes.rows.filter((note: NoteRow) => note.published).length,
    yourNotes: notesRes.rows.filter((note: NoteRow) => note.owner_email === session.email).length,
    publishedByYou: notesRes.rows.filter((note: NoteRow) => note.owner_email === session.email && note.published).length,
    unpublishedByYou: notesRes.rows.filter((note: NoteRow) => note.owner_email === session.email && !note.published).length,
  };

  return (
    <PanelClient
      initialNotes={notesRes.rows}
      initialTags={tagsRes.rows.map((row: TagRow) => row.name)}
      initialStats={initialStats}
      isAdmin={permission.role === "admin"}
    />
  );
}
