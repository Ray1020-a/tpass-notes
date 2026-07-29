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
};

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ q?: string }> }) {
  await initDb();
  const session = await getSession();
  const permission = getPermissionEntry(session);

  const params = await searchParams;
  const q = params?.q?.trim() || "";

  const notesResult = await query<NoteRow>(`
    SELECT id, title, owner_name, owner_email, updated_at, published, content_type
    FROM notes
    WHERE published = true
    ORDER BY updated_at DESC
  `);

  const notes = notesResult.rows.filter((note: NoteRow) => {
    return !q || `${note.title} ${note.owner_name}`.toLowerCase().includes(q.toLowerCase());
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
          <form method="get" className="flex flex-col gap-3 md:flex-row">
            <input
              name="q"
              defaultValue={q}
              placeholder="搜尋標題或作者"
              className="rounded-xl border-2 border-foreground bg-card px-4 py-2.5 shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 focus:-translate-y-0.5 focus:shadow-[5px_5px_0_0_var(--color-foreground)] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-xl border-2 border-foreground bg-primary px-5 py-2.5 font-bold text-background shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)]"
            >
              搜尋
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
