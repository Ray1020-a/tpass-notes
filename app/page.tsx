import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, getPermissionEntry, loginUrlFor } from "@/lib/auth";
import { initDb, query } from "@/lib/db";

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
    const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => noteTags.includes(tag));
    return matchesQuery && matchesTags;
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border-2 border-foreground bg-accent/10 p-6 shadow-[4px_4px_0_0_var(--color-foreground)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent">共編筆記</p>
            <h1 className="mt-2 text-3xl font-extrabold">已上架筆記瀏覽</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {permission.role === "default" ? "您可瀏覽已發布的筆記。" : "可查看公開筆記與管理狀態。"}
            </p>
          </div>
          <form method="get" className="flex flex-col gap-3 md:flex-row md:items-end">
            <input
              name="q"
              defaultValue={q}
              placeholder="搜尋標題或作者"
              className="rounded-xl border-2 border-foreground bg-card px-4 py-2.5 shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 focus:-translate-y-0.5 focus:shadow-[5px_5px_0_0_var(--color-foreground)] focus:outline-none"
            />
            <select
              name="tags"
              multiple
              defaultValue={selectedTags}
              className="min-h-[42px] rounded-xl border-2 border-foreground bg-card px-3 py-2 shadow-[3px_3px_0_0_var(--color-foreground)]"
            >
              {allTags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-xl border-2 border-foreground bg-primary px-5 py-2.5 font-bold text-background shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)]"
            >
              篩選
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4">
        {notes.length === 0 ? (
          <div className="rounded-2xl border-2 border-foreground bg-card p-8 shadow-[4px_4px_0_0_var(--color-foreground)]">
            <p className="font-semibold text-muted-foreground">沒有符合條件的筆記。</p>
          </div>
        ) : (
          notes.map((note: NoteRow) => (
            <article
              key={note.id}
              className="group rounded-2xl border-2 border-foreground bg-card p-5 shadow-[4px_4px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[7px_7px_0_0_var(--color-foreground)]"
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
