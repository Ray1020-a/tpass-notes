import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getSession, getPermissionEntry } from "@/lib/auth";
import { initDb, query } from "@/lib/db";
import { PdfViewer } from "@/components/pdf-viewer";

export const dynamic = "force-dynamic";

type NoteRow = {
  id: number;
  title: string;
  owner_name: string;
  owner_email: string;
  updated_at: string;
  published: boolean;
  content_type: string;
  latest_content: string;
};

type VersionRow = {
  version_number: number;
  content: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
  created_by_name: string;
};

async function getNote(id: number) {
  await initDb();
  const result = await query<NoteRow>(`SELECT * FROM notes WHERE id = $1`, [id]);
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

  const versions = await query<VersionRow>(`SELECT * FROM note_versions WHERE note_id = $1 ORDER BY version_number DESC, created_at DESC`, [note.id]);
  const latestVersion = versions.rows[0];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-foreground bg-accent/10 p-5 shadow-[4px_4px_0_0_var(--color-foreground)]">
        <Link href="/" className="inline-flex rounded-xl border-2 border-foreground bg-card px-3 py-2 font-semibold shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)]">
          ← 返回首頁
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold">{note.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">作者：{note.owner_name} · 更新：{new Date(note.updated_at).toLocaleString("zh-TW")}</p>
      </div>
      <div className="rounded-2xl border-2 border-foreground bg-card p-6 shadow-[4px_4px_0_0_var(--color-foreground)]">
        <div className="mb-4 rounded-xl border-2 border-foreground bg-muted p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">版本資訊</h2>
          <p className="mt-2 text-sm text-muted-foreground">本篇筆記目前共有 {versions.rows.length} 個版本，最新版本由 {latestVersion?.created_by_name || note.owner_name} 建立。</p>
        </div>
        {note.content_type === "pdf" && latestVersion?.file_path ? (
          <PdfViewer fileUrl={latestVersion.file_path} fileName={note.title} />
        ) : (
          <article className="prose prose-sm max-w-none">
            <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]}>
              {latestVersion?.content || note.latest_content || ""}
            </ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}
