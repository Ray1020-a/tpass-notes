import Link from "next/link";
import { redirect } from "next/navigation";
import { canManage, getSession, getPermissionEntry } from "@/lib/auth";
import { initDb, query } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getStats(session: any) {
  await initDb();
  const [all, mine, published, unpublished] = await Promise.all([
    query<any>(`SELECT COUNT(*)::int AS count FROM notes WHERE published = true`),
    query<any>(`SELECT COUNT(*)::int AS count FROM notes WHERE owner_email = $1`, [session?.email]),
    query<any>(`SELECT COUNT(*)::int AS count FROM notes WHERE owner_email = $1 AND published = true`, [session?.email]),
    query<any>(`SELECT COUNT(*)::int AS count FROM notes WHERE owner_email = $1 AND published = false`, [session?.email]),
  ]);
  return {
    total: all.rows[0].count,
    yourNotes: mine.rows[0].count,
    publishedByYou: published.rows[0].count,
    unpublishedByYou: unpublished.rows[0].count,
  };
}

export default async function PanelPage({ searchParams }: { searchParams?: Promise<{ q?: string; tags?: string | string[] }> }) {
  const session = await getSession();
  const permission = getPermissionEntry(session);
  if (!session || !canManage(session)) redirect("/api/auth/login?next=/panel");

  const params = await searchParams;
  const q = params?.q?.trim() || "";
  const selectedTags = Array.isArray(params?.tags) ? params.tags : params?.tags ? [params.tags] : [];

  await initDb();
  const tagsResult = await query<any>(`SELECT name FROM tags ORDER BY name`);
  const tags = tagsResult.rows.map((row: any) => row.name);

  const notesResult = await query<any>(`
    SELECT n.id, n.title, n.owner_name, n.owner_email, n.updated_at, n.created_at, n.published, n.content_type,
           COALESCE(string_agg(t.name, ',') FILTER (WHERE t.name IS NOT NULL), '') AS tags
    FROM notes n
    LEFT JOIN note_tags nt ON nt.note_id = n.id
    LEFT JOIN tags t ON t.id = nt.tag_id
    GROUP BY n.id, n.title, n.owner_name, n.owner_email, n.updated_at, n.created_at, n.published, n.content_type
    ORDER BY n.updated_at DESC
  `);

  const stats = await getStats(session);
  const notes = notesResult.rows.filter((note: any) => {
    const noteTags = note.tags ? note.tags.split(",") : [];
    const matchesQuery = !q || `${note.title} ${note.owner_name}`.toLowerCase().includes(q.toLowerCase());
    const matchesTags = selectedTags.length === 0 || selectedTags.every((tag) => noteTags.includes(tag));
    return matchesQuery && matchesTags;
  });

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["總上架筆記", stats.total],
          ["您的筆記", stats.yourNotes],
          ["您上架的筆記", stats.publishedByYou],
          ["您下架的筆記", stats.unpublishedByYou],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.05_150)] p-4 shadow-[4px_4px_0_0_var(--color-foreground)]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[oklch(0.45_0.13_150)]">{label}</p>
            <p className="mt-3 text-3xl font-extrabold">{value}</p>
          </div>
        ))}
      </section>
      <section className="rounded-2xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.04_250)] p-6 shadow-[4px_4px_0_0_var(--color-foreground)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">管理面板</h1>
            <p className="mt-1 text-sm text-[oklch(0.5_0.012_264)]">{permission.role === "admin" ? "您是最高管理員，可管理所有筆記。" : "您可編輯與管理自己的筆記。"}</p>
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
        {notes.map((note: any) => (
          <article key={note.id} className="rounded-2xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] p-5 shadow-[4px_4px_0_0_var(--color-foreground)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  {note.tags ? note.tags.split(",").filter(Boolean).map((tag: string) => (
                    <span key={tag} className="rounded-md border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.005_250)] px-2 py-0.5 font-mono text-[11px] font-bold">{tag}</span>
                  )) : null}
                </div>
                <h2 className="mt-3 text-xl font-extrabold">{note.title}</h2>
                <p className="mt-2 text-sm text-[oklch(0.5_0.012_264)]">建立：{new Date(note.created_at).toLocaleString("zh-TW")} · 更新：{new Date(note.updated_at).toLocaleString("zh-TW")}</p>
                {permission.role === "admin" ? <p className="mt-1 text-sm text-[oklch(0.5_0.012_264)]">擁有者：{note.owner_name}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/read?id=${note.id}`} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.04_250)] px-3 py-2 font-semibold shadow-[3px_3px_0_0_var(--color-foreground)]">
                  閱讀
                </Link>
                <Link href={`/editor?id=${note.id}`} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.62_0.16_150)] px-3 py-2 font-semibold text-[oklch(0.99_0_0)] shadow-[3px_3px_0_0_var(--color-foreground)]">
                  編輯
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
