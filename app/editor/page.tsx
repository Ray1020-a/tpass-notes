"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type VersionItem = {
  version_number: number;
  content: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
  created_by_name: string;
};

type CollaboratorItem = {
  email: string;
  name: string;
};

export default function EditorPage() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const [title, setTitle] = useState("新筆記");
  const [content, setContent] = useState("# 新筆記\n\n請在這裡輸入內容。\n");
  const [contentType, setContentType] = useState<"markdown" | "pdf">("markdown");
  const [published, setPublished] = useState(true);
  const [mode, setMode] = useState<"edit" | "preview" | "split">("split");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorItem[]>([]);
  const [newCollaborator, setNewCollaborator] = useState("");
  const [newCollaboratorName, setNewCollaboratorName] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 768);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const res = await fetch(`/api/notes/save?id=${id}`);
      const data = await res.json();
      setTitle(data.title || "新筆記");
      setContent(data.content || "# 新筆記\n\n請在這裡輸入內容。\n");
      setContentType(data.contentType === "pdf" ? "pdf" : "markdown");
      setPublished(data.published !== false);
      setVersions(data.versions || []);
      setCollaborators(data.collaborators || []);
    };
    load();
  }, [id]);

  const saveContent = useCallback(async (silent = false) => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notes/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, content, title, contentType, published }),
      });
      const data = await res.json();
      if (!silent) {
        setFeedback(res.ok ? "已儲存筆記內容" : data.error || "儲存失敗");
      }
      if (data.ok && Array.isArray(data.versions)) {
        setVersions(data.versions);
      }
    } finally {
      setSaving(false);
    }
  }, [content, contentType, id, published, title]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!id) return;
      void saveContent(true);
    }, 60000);
    return () => window.clearInterval(interval);
  }, [id, saveContent]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveContent(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveContent]);

  const restoreVersion = async (versionNumber: number) => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notes/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, content, title, contentType, published, restoreVersion: versionNumber }),
      });
      const data = await res.json();
      if (res.ok) {
        setContent(data.content || "");
        setFeedback(`已回復到版本 ${versionNumber}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const saveCollaborators = async (nextCollaborators: CollaboratorItem[]) => {
    if (!id) return;
    const res = await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ collaborators: nextCollaborators }),
    });
    const data = await res.json();
    if (res.ok) {
      setCollaborators(nextCollaborators);
      setFeedback("協作者清單已更新");
    } else {
      setFeedback(data.error || "協作者更新失敗");
    }
  };

  const addCollaborator = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newCollaborator.trim()) return;
    const next = [
      ...collaborators,
      { email: newCollaborator.trim(), name: newCollaboratorName.trim() || newCollaborator.trim() },
    ];
    setNewCollaborator("");
    setNewCollaboratorName("");
    await saveCollaborators(next);
  };

  const uploadPdf = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !pdfFile) return;
    const form = new FormData();
    form.append("file", pdfFile);
    form.append("noteId", id);
    setUploading(true);
    try {
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        setContentType("pdf");
        setFeedback("PDF 已上傳並附加到筆記");
        await saveContent(true);
      } else {
        setFeedback(data.error || "PDF 上傳失敗");
      }
    } finally {
      setUploading(false);
    }
  };

  const preview = useMemo(() => content, [content]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.04_250)] p-5 shadow-[4px_4px_0_0_var(--color-foreground)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[oklch(0.46_0.15_250)]">協作編輯器</p>
          <h1 className="text-2xl font-extrabold">{title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => router.push("/panel")} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] px-3 py-2 font-semibold shadow-[3px_3px_0_0_var(--color-foreground)]">← 返回面板</button>
          <button onClick={() => void saveContent(false)} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.62_0.16_150)] px-3 py-2 font-semibold text-[oklch(0.99_0_0)] shadow-[3px_3px_0_0_var(--color-foreground)]">{saving ? "儲存中…" : "儲存"}</button>
          <button onClick={() => {
            const next = !published;
            setPublished(next);
            void saveContent(false);
          }} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.05_60)] px-3 py-2 font-semibold">
            {published ? "已上架" : "草稿"}
          </button>
          {(["edit", "preview", "split"] as const).map((value) => (
            <button key={value} onClick={() => setMode(value)} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] px-3 py-2 font-semibold shadow-[3px_3px_0_0_var(--color-foreground)]">
              {value === "edit" ? "全編輯" : value === "preview" ? "全預覽" : "分欄"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-4 rounded-2xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] p-4 shadow-[4px_4px_0_0_var(--color-foreground)]">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] px-3 py-2" placeholder="筆記標題" />
            <select value={contentType} onChange={(event) => setContentType(event.target.value as "markdown" | "pdf")} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] px-3 py-2">
              <option value="markdown">Markdown</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          {feedback ? <p className="text-sm text-[oklch(0.5_0.012_264)]">{feedback}</p> : null}
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[oklch(0.5_0.012_264)]">
            <span>格式提示：# 標題、- 清單、**粗體**、```程式碼</span>
          </div>
          {isMobile ? (
            <div className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.04_250)] p-5 text-sm text-[oklch(0.5_0.012_264)]">
              <p className="font-semibold text-[oklch(0.21_0.01_264)]">手機版不支援 Markdown 直接編輯</p>
              <p className="mt-2">請使用平板或電腦開啟此頁面來撰寫與編輯筆記。您仍可查看版本、協作者與上傳 PDF。</p>
            </div>
          ) : mode === "preview" ? (
            <div className="min-h-[60vh] rounded-xl border-2 border-[oklch(0.21_0.01_264)] p-4">
              <article className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview}</ReactMarkdown>
              </article>
            </div>
          ) : mode === "edit" ? (
            <textarea value={content} onChange={(event) => setContent(event.target.value)} className="min-h-[60vh] w-full rounded-xl border-2 border-[oklch(0.21_0.01_264)] p-4 font-mono" />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <textarea value={content} onChange={(event) => setContent(event.target.value)} className="min-h-[60vh] w-full rounded-xl border-2 border-[oklch(0.21_0.01_264)] p-4 font-mono" />
              <div className="min-h-[60vh] rounded-xl border-2 border-[oklch(0.21_0.01_264)] p-4">
                <article className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview}</ReactMarkdown>
                </article>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] p-4 shadow-[4px_4px_0_0_var(--color-foreground)]">
            <h2 className="text-lg font-extrabold">PDF 上傳</h2>
            <form onSubmit={uploadPdf} className="mt-3 space-y-3">
              <input type="file" accept="application/pdf" onChange={(event) => setPdfFile(event.target.files?.[0] || null)} className="w-full rounded-xl border-2 border-[oklch(0.21_0.01_264)] p-2" />
              <button type="submit" className="w-full rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.62_0.16_150)] px-3 py-2 font-semibold text-[oklch(0.99_0_0)]">
                {uploading ? "上傳中…" : "上傳 PDF（20MB 限制）"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] p-4 shadow-[4px_4px_0_0_var(--color-foreground)]">
            <h2 className="text-lg font-extrabold">協作者</h2>
            <form onSubmit={addCollaborator} className="mt-3 space-y-2">
              <input value={newCollaboratorName} onChange={(event) => setNewCollaboratorName(event.target.value)} placeholder="姓名" className="w-full rounded-xl border-2 border-[oklch(0.21_0.01_264)] px-3 py-2" />
              <input value={newCollaborator} onChange={(event) => setNewCollaborator(event.target.value)} placeholder="email" className="w-full rounded-xl border-2 border-[oklch(0.21_0.01_264)] px-3 py-2" />
              <button type="submit" className="w-full rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.04_250)] px-3 py-2 font-semibold">新增協作者</button>
            </form>
            <ul className="mt-3 space-y-2">
              {collaborators.map((collaborator) => (
                <li key={collaborator.email} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.005_250)] px-3 py-2 text-sm">
                  {collaborator.name || collaborator.email}
                  <div className="text-[oklch(0.5_0.012_264)]">{collaborator.email}</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] p-4 shadow-[4px_4px_0_0_var(--color-foreground)]">
            <h2 className="text-lg font-extrabold">版本歷史</h2>
            <ul className="mt-3 space-y-2">
              {versions.map((version) => (
                <li key={version.version_number} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.005_250)] px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span>版本 {version.version_number}</span>
                    <button onClick={() => void restoreVersion(version.version_number)} className="rounded-lg border-2 border-[oklch(0.21_0.01_264)] px-2 py-1 text-xs font-semibold">回復</button>
                  </div>
                  <div className="mt-1 text-[oklch(0.5_0.012_264)]">{version.created_by_name} · {new Date(version.created_at).toLocaleString("zh-TW")}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
