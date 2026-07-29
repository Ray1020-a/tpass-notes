import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, getPermissionEntry, loginUrlFor } from "@/lib/auth";
import { initDb, query } from "@/lib/db";
import { HomeFilter } from "@/components/home-filter";

export const dynamic = "force-dynamic";

type NoteRow = {
  id: number;
  title: string;
  owner_name: string;
  owner_email: string;
  updated_at: string;
  published: boolean;
  content_type: string;
  tags: string;
};

type TagRow = {
  name: string;
};

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ q?: string; tags?: string | string[] }> }) {
  await initDb();
  const session = await getSession();
  if (!session) redirect(loginUrlFor("/"));

  const permission = getPermissionEntry(session);

  const params = await searchParams;
  const q = params?.q?.trim() || "";
  const selectedTags = Array.isArray(params?.tags) ? params.tags : params?.tags ? [params.tags] : [];

  const notesResult = await query<NoteRow>(`
    SELECT n.id, n.title, n.owner_name, n.owner_email, n.updated_at, n.published, n.content_type,
           COALESCE(string_agg(t.name, ',') FILTER (WHERE t.name IS NOT NULL), '') AS tags
    FROM notes n
    LEFT JOIN note_tags nt ON nt.note_id = n.id
    LEFT JOIN tags t ON t.id = nt.tag_id
    WHERE n.published = true
    GROUP BY n.id, n.title, n.owner_name, n.owner_email, n.updated_at, n.published, n.content_type
    ORDER BY n.updated_at DESC
  `);

  const tagsResult = await query<TagRow>(`SELECT name FROM tags ORDER BY name`);
  const allTags = tagsResult.rows.map((row: TagRow) => row.name);

  const notes = notesResult.rows.filter((note: NoteRow) => {
    const noteTags = note.tags ? note.tags.split(",") : [];
    const matchesQuery = !q || `${note.title} ${note.owner_name}`.toLowerCase().includes(q.toLowerCase());
    const matchesTags = selectedTags.length === 0 || selectedTags.every((tag) => noteTags.includes(tag));
    return matchesQuery && matchesTags;
  });

  return (
    <div className="space-y-6">
      <HomeFilter allTags={allTags} initialQ={q} initialTags={selectedTags} permissionRole={permission.role} />

      <section className="grid gap-4">
        {notes.length === 0 ? (
          <div className="rounded-2xl border-2 border-foreground bg-card p-8 shadow-[4px_4px_0_0_var(--color-foreground)]">
            <p className="font-bold text-muted-foreground">沒有符合條件的筆記。</p>
          </div>
        ) : (
          notes.map((note: NoteRow) => (
            <article
              key={note.id}
              className="group rounded-2xl border-2 border-foreground bg-card p-5 shadow-[4px_4px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[7px_7px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[3px_3px_0_0_var(--color-foreground)]"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                  {note.tags ? (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {note.tags.split(",").filter(Boolean).map((tag: string) => (
                        <span
                          key={tag}
                          className="rounded-md border-2 border-foreground bg-muted px-2 py-0.5 font-mono text-[11px] font-bold"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <h2 className="text-xl font-extrabold group-hover:text-primary transition-colors">{note.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    擁有者：{note.owner_name} · 更新：{new Date(note.updated_at).toLocaleString("zh-TW")}
                  </p>
                </div>
                <Link
                  href={`/read?id=${note.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-foreground bg-accent/10 px-4 py-2.5 font-bold shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)]"
                >
                  開啟閱讀
                  <span className="text-lg transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
