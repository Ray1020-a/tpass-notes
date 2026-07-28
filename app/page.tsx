import Link from "next/link";
import { getSession, getPermissionEntry } from "@/lib/auth";
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
  const tags = tagsResult.rows.map((row: TagRow) => row.name);

  const notes = notesResult.rows.filter((note: NoteRow) => {
    const noteTags = note.tags ? note.tags.split(",") : [];
    const matchesQuery = !q || `${note.title} ${note.owner_name}`.toLowerCase().includes(q.toLowerCase());
    const matchesTags = selectedTags.length === 0 || selectedTags.every((tag) => noteTags.includes(tag));
    return matchesQuery && matchesTags;
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.04_250)] p-6 shadow-[4px_4px_0_0_var(--color-foreground)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[oklch(0.46_0.15_250)]">共編筆記</p>
            <h1 className="mt-2 text-3xl font-extrabold">已上架筆記瀏覽</h1>
            <p className="mt-2 text-sm text-[oklch(0.5_0.012_264)]">{permission.role === "default" ? "您可瀏覽已發布的筆記。" : "可查看公開筆記與管理狀態。"}</p>
          </div>
          <form method="get" className="flex flex-col gap-3 md:flex-row">
            <input name="q" defaultValue={q} placeholder="搜尋標題或作者" className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] px-3 py-2 shadow-[3px_3px_0_0_var(--color-foreground)]" />
            <select name="tags" multiple className="min-h-10 rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] px-3 py-2 shadow-[3px_3px_0_0_var(--color-foreground)]">
              {tags.map((tag) => (
                <option key={tag} value={tag} selected={selectedTags.includes(tag)}>
                  {tag}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.62_0.16_150)] px-4 py-2 font-semibold text-[oklch(0.99_0_0)] shadow-[3px_3px_0_0_var(--color-foreground)]">
              篩選
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4">
        {notes.length === 0 ? (
          <div className="rounded-2xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] p-6 shadow-[4px_4px_0_0_var(--color-foreground)]">
            沒有符合條件的筆記。
          </div>
        ) : (
          notes.map((note: NoteRow) => (
            <article key={note.id} className="rounded-2xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] p-5 shadow-[4px_4px_0_0_var(--color-foreground)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    {note.tags ? note.tags.split(",").filter(Boolean).map((tag: string) => (
                      <span key={tag} className="rounded-md border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.005_250)] px-2 py-0.5 font-mono text-[11px] font-bold">{tag}</span>
                    )) : null}
                  </div>
                  <h2 className="mt-3 text-xl font-extrabold">{note.title}</h2>
                  <p className="mt-2 text-sm text-[oklch(0.5_0.012_264)]">擁有者：{note.owner_name} · 更新：{new Date(note.updated_at).toLocaleString("zh-TW")}</p>
                </div>
                <Link href={`/read?id=${note.id}`} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.04_250)] px-4 py-2 font-semibold shadow-[3px_3px_0_0_var(--color-foreground)]">
                  開啟閱讀
                </Link>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
