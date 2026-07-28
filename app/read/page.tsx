import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getSession, getPermissionEntry } from "@/lib/auth";
import { initDb, query } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getNote(id: number) {
  await initDb();
  const result = await query<any>(`SELECT * FROM notes WHERE id = $1`, [id]);
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

export default async function ReadPage({ searchParams }: { searchParams?: Promise<{ id?: string }> }) {
  const session = await getSession();
  const permission = getPermissionEntry(session);
  if (!session || !permission.read) redirect("/api/auth/login?next=/");

  const params = await searchParams;
  const idValue = params?.id;
  if (!idValue || !/^\d+$/.test(idValue)) notFound();

  const note = await getNote(Number(idValue));
  if (!note || !note.published) notFound();

  const versions = await query<any>(`SELECT * FROM note_versions WHERE note_id = $1 ORDER BY version_number DESC, created_at DESC`, [note.id]);
  const latestVersion = versions.rows[0];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.04_250)] p-5 shadow-[4px_4px_0_0_var(--color-foreground)]">
        <Link href="/" className="inline-flex rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] px-3 py-2 font-semibold shadow-[3px_3px_0_0_var(--color-foreground)]">
          ← 返回首頁
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold">{note.title}</h1>
        <p className="mt-2 text-sm text-[oklch(0.5_0.012_264)]">作者：{note.owner_name} · 更新：{new Date(note.updated_at).toLocaleString("zh-TW")}</p>
      </div>
      <div className="rounded-2xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] p-6 shadow-[4px_4px_0_0_var(--color-foreground)]">
        {note.content_type === "pdf" && latestVersion?.file_path ? (
          <iframe src={`/uploads/${latestVersion.file_path.split("/").pop()}`} className="min-h-[70vh] w-full rounded-xl border-2 border-[oklch(0.21_0.01_264)]" />
        ) : (
          <article className="prose prose-sm max-w-none">
            <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]}>{latestVersion?.content || note.latest_content || ""}</ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}
