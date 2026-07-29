"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TagMultiSelect } from "@/components/tag-multi-select";

type VersionItem = {
  id?: number;
  version_number: number;
  content: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
  created_by_name: string;
  created_by_email: string;
  created_by_sub?: string;
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
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [sessionEmail, setSessionEmail] = useState("");
  const [sessionSub, setSessionSub] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [showTypeSwitch, setShowTypeSwitch] = useState(false);
  const [pendingType, setPendingType] = useState<"markdown" | "pdf" | null>(null);
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

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
      if (res.status === 403) { setForbidden(true); return; }
      const data = await res.json();
      setTitle(data.title || "新筆記");
      setContent(data.content || "# 新筆記\n\n請在這裡輸入內容。\n");
      setContentType(data.contentType === "pdf" ? "pdf" : "markdown");
      setPublished(data.published !== false);
      setVersions(data.versions || []);
      setCollaborators(data.collaborators || []);
      setNoteTags(data.tags || []);
      setAllTags(data.allTags || []);
      setSessionEmail(data.sessionEmail || "");
      setSessionSub(data.sessionSub || "");
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
      if (!silent) setFeedback(res.ok ? "已儲存筆記內容" : data.error || "儲存失敗");
      if (data.ok && Array.isArray(data.versions)) {
        setVersions(data.versions);
        setSessionEmail(data.sessionEmail || sessionEmail);
        setSessionSub(data.sessionSub || sessionSub);
      }
    } finally { setSaving(false); }
  }, [content, contentType, id, published, title, sessionEmail, sessionSub]);

  useEffect(() => {
    const interval = window.setInterval(() => { if (id) void saveContent(true); }, 60000);
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
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, content, title, contentType, published, restoreVersion: versionNumber }),
      });
      const data = await res.json();
      if (res.ok) { setContent(data.content || ""); setFeedback(`已回復到版本 ${versionNumber}`); setShowVersions(false); }
    } finally { setSaving(false); }
  };

  const deleteVersion = async (versionNumber: number) => {
    if (!id) return;
    if (!window.confirm(`確定要刪除版本 ${versionNumber} 嗎？`)) return;
    const res = await fetch(`/api/notes/save`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, versionNumber }) });
    const data = await res.json();
    if (res.ok) { setVersions((prev) => prev.filter((v) => v.version_number !== versionNumber)); setFeedback(`已刪除版本 ${versionNumber}`); }
    else { setFeedback(data.error || "刪除失敗"); }
  };

  const saveCollaborators = async (nextCollaborators: CollaboratorItem[]) => {
    if (!id) return;
    const res = await fetch(`/api/notes/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ collaborators: nextCollaborators }) });
    const data = await res.json();
    if (res.ok) { setCollaborators(nextCollaborators); setFeedback("協作者清單已更新"); }
    else { setFeedback(data.error || "協作者更新失敗"); }
  };

  const addCollaborator = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newCollaborator.trim()) return;
    const next = [...collaborators, { email: newCollaborator.trim(), name: newCollaborator.trim() }];
    setNewCollaborator("");
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
      } else { setFeedback(data.error || "PDF 上傳失敗"); }
    } finally { setUploading(false); }
  };

  const confirmTypeSwitch = () => {
    if (!pendingType) return;
    setContentType(pendingType);
    setShowTypeSwitch(false);
    setPendingType(null);
    if (pendingType === "markdown") setFeedback("已切換為 Markdown 模式");
    else setFeedback("已切換為 PDF 模式，請上傳檔案");
  };

  const preview = useMemo(() => content, [content]);

  const canDeleteVersion = (v: VersionItem) =>
    v.created_by_email === sessionEmail || collaborators.some((c) => c.email === v.created_by_email && c.email === sessionEmail);

  if (forbidden) {
    return (
      <div className="rounded-2xl border-2 border-foreground bg-destructive/10 p-8 shadow-[4px_4px_0_0_var(--color-foreground)]">
        <h1 className="text-2xl font-extrabold">權限不足</h1>
        <p className="mt-3">您沒有編輯此筆記的權限。</p>
        <button onClick={() => router.push("/panel")} className="mt-6 rounded-xl border-2 border-foreground bg-card px-4 py-2 font-semibold shadow-[3px_3px_0_0_var(--color-foreground)]">返回面板</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-foreground bg-accent/10 p-5 shadow-[4px_4px_0_0_var(--color-foreground)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">協作編輯器</p>
          <h1 className="text-2xl font-extrabold">{title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => router.push("/panel")} className="rounded-xl border-2 border-foreground bg-card px-3 py-2 font-semibold shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)]">← 返回面板</button>
          <button onClick={() => setShowVersions(true)} className="rounded-xl border-2 border-foreground bg-card px-3 py-2 font-semibold shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)]">疊代</button>
          <button onClick={() => void saveContent(false)} className="rounded-xl border-2 border-foreground bg-primary px-3 py-2 font-semibold text-background shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)]">
            {saving ? "儲存中…" : "儲存"}
          </button>
          <button onClick={() => { const next = !published; setPublished(next); void saveContent(false); }} className="rounded-xl border-2 border-foreground bg-secondary px-3 py-2 font-semibold shadow-[3px_3px_0_0_var(--color-foreground)]">
            {published ? "已上架" : "草稿"}
          </button>
          {contentType === "markdown" ? (
            (["edit", "preview", "split"] as const).map((value) => (
              <button key={value} onClick={() => setMode(value)} className={`rounded-xl border-2 border-foreground px-3 py-2 font-semibold shadow-[3px_3px_0_0_var(--color-foreground)] ${mode === value ? "bg-primary text-background" : "bg-card"}`}>
                {value === "edit" ? "全編輯" : value === "preview" ? "全預覽" : "分欄"}
              </button>
            ))
          ) : null}
        </div>
      </div>

      {showTypeSwitch ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4" onClick={() => { setShowTypeSwitch(false); setPendingType(null); }}>
          <div className="w-full max-w-md rounded-2xl border-2 border-foreground bg-card p-6 shadow-[6px_6px_0_0_var(--color-foreground)]" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-xl font-extrabold">切換筆記類型</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {pendingType === "pdf"
                ? "切換為 PDF 後，目前的 Markdown 內容將被隱藏，請上傳 PDF 檔案作為新版本。"
                : "切換為 Markdown 後，將可使用內建編輯器撰寫內容。"}
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => { setShowTypeSwitch(false); setPendingType(null); }} className="flex-1 rounded-xl border-2 border-foreground bg-card px-4 py-2.5 font-bold shadow-[3px_3px_0_0_var(--color-foreground)]">
                取消
              </button>
              <button onClick={confirmTypeSwitch} className="flex-1 rounded-xl border-2 border-foreground bg-primary px-4 py-2.5 font-bold text-background shadow-[3px_3px_0_0_var(--color-foreground)]">
                確認切換
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showVersions ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4" onClick={() => setShowVersions(false)}>
          <div className="w-full max-w-lg rounded-2xl border-2 border-foreground bg-card p-6 shadow-[6px_6px_0_0_var(--color-foreground)]" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-xl font-extrabold">版本疊代</h2>
            <p className="mt-1 text-sm text-muted-foreground">選擇要回復的版本，或刪除不需要的版本。</p>
            <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto">
              {versions.map((v) => (
                <li key={v.version_number} className={`rounded-xl border-2 p-3 text-sm ${selectedVersion === v.version_number ? "border-primary bg-primary/10" : "border-foreground bg-muted"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <button onClick={() => setSelectedVersion(v.version_number)} className="flex items-center gap-2">
                      <span className={`inline-block h-4 w-4 rounded-full border-2 ${selectedVersion === v.version_number ? "border-primary bg-primary" : "border-foreground"}`} />
                      <span className="font-bold">版本 {v.version_number}</span>
                    </button>
                    <div className="flex gap-1">
                      <button onClick={() => void restoreVersion(v.version_number)} className="rounded-lg border-2 border-foreground bg-card px-2 py-1 text-xs font-semibold shadow-[2px_2px_0_0_var(--color-foreground)]">回復</button>
                      {canDeleteVersion(v) ? (
                        <button onClick={() => void deleteVersion(v.version_number)} className="rounded-lg border-2 border-foreground bg-destructive px-2 py-1 text-xs font-semibold text-background shadow-[2px_2px_0_0_var(--color-foreground)]">刪除</button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-1 text-muted-foreground">{v.created_by_name} · {new Date(v.created_at).toLocaleString("zh-TW")}</div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setShowVersions(false); setSelectedVersion(null); }} className="rounded-xl border-2 border-foreground bg-card px-4 py-2 font-semibold shadow-[3px_3px_0_0_var(--color-foreground)]">取消</button>
              <button onClick={() => { if (selectedVersion) void restoreVersion(selectedVersion); }} disabled={!selectedVersion} className="rounded-xl border-2 border-foreground bg-primary px-4 py-2 font-semibold text-background shadow-[3px_3px_0_0_var(--color-foreground)] disabled:opacity-40">回復到此版本</button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-4 rounded-2xl border-2 border-foreground bg-card p-4 shadow-[4px_4px_0_0_var(--color-foreground)]">
          <div className="flex items-center justify-between gap-3">
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="flex-1 rounded-xl border-2 border-foreground px-3 py-2" placeholder="筆記標題" />
            <div className="flex items-center gap-1.5 rounded-xl border-2 border-foreground bg-muted px-3 py-2 text-sm font-bold">
              <span>{contentType === "pdf" ? "PDF" : "MD"}</span>
              <button
                onClick={() => {
                  const next = contentType === "pdf" ? "markdown" : "pdf";
                  setPendingType(next);
                  setShowTypeSwitch(true);
                }}
                className="ml-1 text-xs text-muted-foreground underline transition-colors hover:text-foreground"
              >
                切換
              </button>
            </div>
          </div>
          {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}

          {contentType === "markdown" ? (
            <>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <span>格式提示：# 標題、- 清單、**粗體**、```程式碼</span>
              </div>
              {isMobile ? (
                <div className="rounded-xl border-2 border-foreground bg-accent/10 p-5 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">手機版不支援 Markdown 直接編輯</p>
                  <p className="mt-2">請使用平板或電腦開啟此頁面來撰寫與編輯筆記。</p>
                </div>
              ) : mode === "preview" ? (
                <div className="min-h-[60vh] rounded-xl border-2 border-foreground p-4">
                  <article className="prose prose-sm max-w-none">
                    <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]}>{preview}</ReactMarkdown>
                  </article>
                </div>
              ) : mode === "edit" ? (
                <textarea value={content} onChange={(event) => setContent(event.target.value)} className="min-h-[60vh] w-full rounded-xl border-2 border-foreground p-4 font-mono" />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  <textarea value={content} onChange={(event) => setContent(event.target.value)} className="min-h-[60vh] w-full rounded-xl border-2 border-foreground p-4 font-mono" />
                  <div className="min-h-[60vh] rounded-xl border-2 border-foreground p-4">
                    <article className="prose prose-sm max-w-none">
                      <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]}>{preview}</ReactMarkdown>
                    </article>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-foreground bg-muted p-8 text-center">
              <p className="text-lg font-bold">PDF 文件</p>
              <p className="mt-1 text-sm text-muted-foreground">
                使用右側面板上傳 PDF 檔案，每次上傳自動建立一個新版本。
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border-2 border-foreground bg-card p-4 shadow-[4px_4px_0_0_var(--color-foreground)]">
            <h2 className="text-lg font-extrabold">
              {contentType === "pdf" ? "PDF 上傳" : "轉為 PDF"}
            </h2>
            <form onSubmit={uploadPdf} className="mt-3 space-y-3">
              <input type="file" accept="application/pdf" onChange={(event) => setPdfFile(event.target.files?.[0] || null)} className="w-full rounded-xl border-2 border-foreground p-2" />
              <button type="submit" className="w-full rounded-xl border-2 border-foreground bg-primary px-3 py-2 font-semibold text-background shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)]">
                {uploading ? "上傳中…" : "上傳 PDF（20MB 限制）"}
              </button>
            </form>
            {contentType === "markdown" ? (
              <p className="mt-2 text-xs text-muted-foreground">上傳 PDF 後會自動切換為 PDF 模式。</p>
            ) : null}
          </section>

          <section className="rounded-2xl border-2 border-foreground bg-card p-4 shadow-[4px_4px_0_0_var(--color-foreground)]">
            <h2 className="text-lg font-extrabold">協作者</h2>
            <form onSubmit={addCollaborator} className="mt-3 space-y-2">
              <input value={newCollaborator} onChange={(event) => setNewCollaborator(event.target.value)} placeholder="email" className="w-full rounded-xl border-2 border-foreground px-3 py-2" />
              <button type="submit" className="w-full rounded-xl border-2 border-foreground bg-accent/10 px-3 py-2 font-semibold shadow-[3px_3px_0_0_var(--color-foreground)]">新增協作者</button>
            </form>
            <ul className="mt-3 space-y-2">
              {collaborators.map((c) => (
                <li key={c.email} className="rounded-xl border-2 border-foreground bg-muted px-3 py-2 text-sm">
                  {c.name || c.email}
                  <div className="text-muted-foreground">{c.email}</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border-2 border-foreground bg-card p-4 shadow-[4px_4px_0_0_var(--color-foreground)]">
            <h2 className="text-lg font-extrabold">標籤</h2>
            <div className="mt-3">
              <TagMultiSelect tags={allTags} selected={noteTags} onChange={async (next) => {
                setNoteTags(next);
                if (!id) return;
                await fetch("/api/notes/tags", {
                  method: "POST", headers: { "content-type": "application/json" },
                  body: JSON.stringify({ noteId: id, tags: next }),
                });
                setFeedback("標籤已更新");
              }} />
            </div>
          </section>

          <section className="rounded-2xl border-2 border-foreground bg-card p-4 shadow-[4px_4px_0_0_var(--color-foreground)]">
            <h2 className="text-lg font-extrabold">版本歷史</h2>
            <ul className="mt-3 space-y-2">
              {versions.slice(0, 5).map((v) => (
                <li key={v.version_number} className="rounded-xl border-2 border-foreground bg-muted px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span>版本 {v.version_number}</span>
                    <button onClick={() => void restoreVersion(v.version_number)} className="rounded-lg border-2 border-foreground bg-card px-2 py-1 text-xs font-semibold shadow-[2px_2px_0_0_var(--color-foreground)]">回復</button>
                  </div>
                  <div className="mt-1 text-muted-foreground">{v.created_by_name} · {new Date(v.created_at).toLocaleString("zh-TW")}</div>
                </li>
              ))}
            </ul>
            {versions.length > 5 ? (
              <button onClick={() => setShowVersions(true)} className="mt-2 w-full rounded-xl border-2 border-foreground bg-muted px-3 py-2 text-sm font-semibold shadow-[3px_3px_0_0_var(--color-foreground)]">
                查看全部 {versions.length} 個版本 →
              </button>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
