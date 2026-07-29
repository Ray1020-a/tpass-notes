"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TagMultiSelect } from "@/components/tag-multi-select";

interface NoteRow {
  id: number;
  title: string;
  owner_name: string;
  owner_email: string;
  created_at: string;
  updated_at: string;
  published: boolean;
  content_type: string;
  tags: string;
  latest_content?: string;
  file_path?: string;
  file_size?: number;
}

interface VersionItem {
  id?: number;
  version_number: number;
  content?: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
  created_by_name: string;
  created_by_email: string;
  created_by_sub?: string;
}

interface PanelClientProps {
  initialNotes: NoteRow[];
  initialTags: string[];
  initialStats: {
    total: number;
    yourNotes: number;
    publishedByYou: number;
    unpublishedByYou: number;
  };
  isAdmin: boolean;
}

export function PanelClient({ initialNotes, initialTags, initialStats, isAdmin }: PanelClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [notes, setNotes] = useState(initialNotes);
  const [tags, setTags] = useState(initialTags);
  const [stats, setStats] = useState(initialStats);
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(searchParams.getAll("tags"));
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState("markdown");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [detailNoteId, setDetailNoteId] = useState<number | null>(null);
  const [detailNote, setDetailNote] = useState<NoteRow | null>(null);
  const [detailTags, setDetailTags] = useState<string[]>([]);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailNewCollab, setDetailNewCollab] = useState("");
  const [detailCollaborators, setDetailCollaborators] = useState<{ email: string; name: string }[]>([]);
  const [detailVersions, setDetailVersions] = useState<VersionItem[]>([]);
  const [feedback, setFeedback] = useState("");
  const [sessionEmail, setSessionEmail] = useState("");
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  useEffect(() => {
    const load = async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      for (const tag of selectedTags) params.append("tags", tag);
      router.replace(`/panel?${params.toString()}`);
      const res = await fetch(`/api/notes?${params.toString()}`);
      const data = await res.json();
      setNotes(data.notes || []);
      setTags(data.tags || []);
      setStats(data.stats || initialStats);
    };
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [q, selectedTags, router, initialStats]);

  const createNote = async () => {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, contentType, tags: newTags }),
    });
    const data = await res.json();
    if (data.ok) {
      setCreating(false);
      setTitle("");
      setNewTags([]);
      window.location.href = `/editor?id=${data.id}`;
    }
  };

  const togglePublish = async (noteId: number, published: boolean) => {
    const ok = window.confirm(published ? "確定要下架這篇筆記嗎？" : "確定要上架這篇筆記嗎？");
    if (!ok) return;
    const res = await fetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ published: !published }),
    });
    if (res.ok) {
      setNotes((prev) => prev.map((note) => (note.id === noteId ? { ...note, published: !published } : note)));
    }
  };

  const deleteNote = async (noteId: number) => {
    if (!window.confirm("確定要永久刪除此筆記？此操作無法復原。")) return;
    const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
    if (res.ok) {
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
    } else {
      const data = await res.json();
      alert(data.error || "刪除失敗");
    }
  };

  const openDetail = async (note: NoteRow) => {
    setDetailNoteId(note.id);
    setDetailNote(note);
    setDetailTitle(note.title);
    setDetailTags(note.tags ? note.tags.split(",").filter(Boolean) : []);
    setFeedback("");
    const res = await fetch(`/api/notes/save?id=${note.id}`);
    const data = await res.json();
    setDetailCollaborators(data.collaborators || []);
    setDetailVersions(data.versions || []);
    setSessionEmail(data.sessionEmail || "");
  };

  const saveDetail = async () => {
    if (!detailNoteId) return;
    const res = await fetch(`/api/notes/${detailNoteId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: detailTitle }),
    });
    if (res.ok) {
      setFeedback("標題已更新");
      setNotes((prev) => prev.map((n) => n.id === detailNoteId ? { ...n, title: detailTitle } : n));
    }
  };

  const updateDetailTags = async (next: string[]) => {
    setDetailTags(next);
    if (!detailNoteId) return;
    const res = await fetch(`/api/notes/tags`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ noteId: detailNoteId, tags: next }),
    });
    if (!res.ok) setFeedback("標籤更新失敗");
  };

  const addDetailCollaborator = async () => {
    if (!detailNoteId || !detailNewCollab.trim()) return;
    const next = [
      ...detailCollaborators,
      { email: detailNewCollab.trim(), name: detailNewCollab.trim() },
    ];
    const res = await fetch(`/api/notes/${detailNoteId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ collaborators: next }),
    });
    if (res.ok) {
      setDetailCollaborators(next);
      setDetailNewCollab("");
      setDetailNewCollabName("");
      setFeedback("協作者已新增");
    }
  };

  const deleteDetailVersion = async (versionNumber: number) => {
    if (!detailNoteId) return;
    if (!window.confirm(`確定要刪除版本 ${versionNumber} 嗎？`)) return;
    const res = await fetch(`/api/notes/save`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: detailNoteId, versionNumber }),
    });
    if (res.ok) {
      setDetailVersions((prev) => prev.filter((v) => v.version_number !== versionNumber));
      setFeedback(`已刪除版本 ${versionNumber}`);
    } else {
      const data = await res.json();
      setFeedback(data.error || "刪除失敗");
    }
  };

  const addTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    if (tags.includes(name)) { setFeedback("標籤已存在"); return; }
    const res = await fetch(`/api/notes/tags/manage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (res.ok) {
      setTags((prev) => [...prev, name].sort());
      setNewTagName("");
      setFeedback(`標籤「${name}」已新增`);
    } else {
      setFeedback(data.error || "新增失敗");
    }
  };

  const deleteTag = async (name: string) => {
    const res = await fetch(`/api/notes/tags/manage`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (res.ok) {
      setTags((prev) => prev.filter((t) => t !== name));
      setFeedback(`標籤「${name}」已移除`);
    } else {
      setFeedback(data.error || `無法移除：${data.reason || ""}`);
    }
  };

  const getWordCount = (content?: string) => {
    if (!content) return 0;
    return content.replace(/\s/g, "").length;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["總上架筆記", stats.total],
          ["您的筆記", stats.yourNotes],
          ["您上架的筆記", stats.publishedByYou],
          ["您下架的筆記", stats.unpublishedByYou],
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="rounded-2xl border-2 border-foreground bg-primary/10 p-5 shadow-[4px_4px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[7px_7px_0_0_var(--color-foreground)]"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{label as string}</p>
            <p className="mt-2 text-3xl font-extrabold">{value as number}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border-2 border-foreground bg-accent/10 p-6 shadow-[4px_4px_0_0_var(--color-foreground)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">管理面板</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin ? "您是最高管理員，可管理所有筆記。" : "您可編輯與管理自己的筆記。"}
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="搜尋標題或作者"
              className="rounded-xl border-2 border-foreground bg-card px-4 py-2.5 shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 focus:-translate-y-0.5 focus:shadow-[5px_5px_0_0_var(--color-foreground)] focus:outline-none"
            />
            <TagMultiSelect tags={tags} selected={selectedTags} onChange={setSelectedTags} />
            <button
              onClick={() => setCreating(true)}
              className="rounded-xl border-2 border-foreground bg-primary px-5 py-2.5 font-bold text-background shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)]"
            >
              ＋ 新增筆記
            </button>
            <button
              onClick={() => setShowTagManager(true)}
              className="rounded-xl border-2 border-foreground bg-card px-5 py-2.5 font-bold shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)]"
            >
              管理標籤
            </button>
          </div>
        </div>
      </section>

      {creating ? (
        <div className="rounded-2xl border-2 border-foreground bg-card p-6 shadow-[4px_4px_0_0_var(--color-foreground)]">
          <h2 className="text-xl font-extrabold">新增筆記</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="筆記標題"
              className="flex-1 rounded-xl border-2 border-foreground bg-card px-4 py-2.5 shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 focus:-translate-y-0.5 focus:shadow-[5px_5px_0_0_var(--color-foreground)] focus:outline-none"
              onKeyDown={(event) => event.key === "Enter" && createNote()}
            />
            <select
              value={contentType}
              onChange={(event) => setContentType(event.target.value)}
              className="rounded-xl border-2 border-foreground bg-card px-4 py-2.5 shadow-[3px_3px_0_0_var(--color-foreground)]"
            >
              <option value="markdown">MarkDown</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          <div className="mt-3">
            <label className="text-sm font-semibold">標籤</label>
            <div className="mt-2">
              <TagMultiSelect tags={tags} selected={newTags} onChange={setNewTags} placeholder="選擇標籤" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={createNote}
              disabled={!title.trim()}
              className="rounded-xl border-2 border-foreground bg-primary px-5 py-2.5 font-bold text-background shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)] disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_0_var(--color-foreground)]"
            >
              建立
            </button>
            <button
              onClick={() => setCreating(false)}
              className="rounded-xl border-2 border-foreground bg-card px-5 py-2.5 font-bold shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)]"
            >
              取消
            </button>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4">
        {notes.map((note) => (
          <article
            key={note.id}
            className="group rounded-2xl border-2 border-foreground bg-card p-5 shadow-[4px_4px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[7px_7px_0_0_var(--color-foreground)]"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <button onClick={() => openDetail(note)} className="flex-1 text-left">
                {note.tags ? (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {note.tags.split(",").filter(Boolean).map((tag: string) => (
                      <span key={tag} className="rounded-md border-2 border-foreground bg-muted px-2 py-0.5 font-mono text-[11px] font-bold">{tag}</span>
                    ))}
                  </div>
                ) : null}
                <h2 className="text-xl font-extrabold group-hover:text-primary transition-colors">{note.title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {note.content_type === "pdf"
                    ? `📄 PDF · ${formatFileSize(note.file_size)}`
                    : `📝 MD · ${getWordCount(note.latest_content)} 字`
                  }
                  {isAdmin ? ` · ${note.owner_name}` : ""}
                  <span className="ml-2">更新：{new Date(note.updated_at).toLocaleString("zh-TW")}</span>
                </p>
              </button>
              <div className="flex items-center gap-2">
                <Link
                  href={`/read?id=${note.id}`}
                  className="rounded-xl border-2 border-foreground bg-accent/10 px-4 py-2.5 text-sm font-bold shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)]"
                >
                  閱讀
                </Link>
                <Link
                  href={`/editor?id=${note.id}`}
                  className="rounded-xl border-2 border-foreground bg-primary px-4 py-2.5 text-sm font-bold text-background shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)]"
                >
                  編輯
                </Link>
                <button
                  onClick={() => togglePublish(note.id, note.published)}
                  className={`rounded-xl border-2 border-foreground px-4 py-2.5 text-sm font-bold shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)] ${
                    note.published ? "bg-secondary text-foreground" : "bg-destructive text-background"
                  }`}
                >
                  {note.published ? "下架" : "上架"}
                </button>
                {!note.published ? (
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="rounded-xl border-2 border-foreground bg-card px-4 py-2.5 text-sm font-bold shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)]"
                  >
                    刪除
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </section>

      {detailNoteId && detailNote ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4"
          onClick={() => setDetailNoteId(null)}
        >
          <div
            className="w-full max-w-lg space-y-5 rounded-2xl border-2 border-foreground bg-card p-6 shadow-[6px_6px_0_0_var(--color-foreground)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">筆記詳情</h2>
              <span className="rounded-md border-2 border-foreground bg-muted px-2.5 py-1 font-mono text-xs font-bold">
                {detailNote.content_type === "pdf" ? "PDF" : "MD"}
              </span>
            </div>
            {feedback ? (
              <p className="rounded-lg border-2 border-foreground bg-accent/10 px-3 py-2 text-sm font-medium text-muted-foreground">{feedback}</p>
            ) : null}

            <div>
              <label className="text-sm font-semibold">標題</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={detailTitle}
                  onChange={(event) => setDetailTitle(event.target.value)}
                  className="flex-1 rounded-xl border-2 border-foreground bg-card px-3 py-2 shadow-[2px_2px_0_0_var(--color-foreground)] transition-all duration-200 focus:-translate-y-0.5 focus:shadow-[4px_4px_0_0_var(--color-foreground)] focus:outline-none"
                />
                <button
                  onClick={saveDetail}
                  className="rounded-xl border-2 border-foreground bg-primary px-4 py-2 text-sm font-bold text-background shadow-[2px_2px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[1px_1px_0_0_var(--color-foreground)]"
                >
                  儲存
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">標籤</label>
              <div className="mt-2">
                <TagMultiSelect tags={tags} selected={detailTags} onChange={updateDetailTags} />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">編輯</label>
              <div className="mt-2">
                <Link
                  href={`/editor?id=${detailNote.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-foreground bg-primary px-4 py-2.5 text-sm font-bold text-background shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)]"
                >
                  {detailNote.content_type === "pdf" ? "上傳新版本" : "進入編輯器"}
                  <span className="text-base">→</span>
                </Link>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">協作者</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={detailNewCollab}
                  onChange={(event) => setDetailNewCollab(event.target.value)}
                  placeholder="email"
                  className="flex-1 rounded-xl border-2 border-foreground bg-card px-3 py-2 text-sm shadow-[2px_2px_0_0_var(--color-foreground)] transition-all duration-200 focus:-translate-y-0.5 focus:shadow-[4px_4px_0_0_var(--color-foreground)] focus:outline-none"
                  onKeyDown={(event) => event.key === "Enter" && addDetailCollaborator()}
                />
                <button
                  onClick={addDetailCollaborator}
                  className="rounded-xl border-2 border-foreground bg-primary px-4 py-2 text-sm font-bold text-background shadow-[2px_2px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[1px_1px_0_0_var(--color-foreground)]"
                >
                  新增
                </button>
              </div>
              {detailCollaborators.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {detailCollaborators.map((c) => (
                    <li
                      key={c.email}
                      className="flex items-center justify-between rounded-xl border-2 border-foreground bg-muted px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-semibold">{c.name || c.email}</span>
                        <span className="ml-1 text-muted-foreground">({c.email})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">尚無協作者</p>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold">版本歷史</label>
              {detailVersions.length > 0 ? (
                <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
                  {detailVersions.map((v) => (
                    <li
                      key={v.version_number}
                      className="flex items-center justify-between rounded-xl border-2 border-foreground bg-muted px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-bold">版本 {v.version_number}</span>
                        <div className="text-xs text-muted-foreground">
                          {v.created_by_name} · {new Date(v.created_at).toLocaleString("zh-TW")}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteDetailVersion(v.version_number)}
                        className="rounded-lg border-2 border-foreground bg-destructive px-2.5 py-1 text-xs font-bold text-background shadow-[2px_2px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[1px_1px_0_0_var(--color-foreground)]"
                      >
                        刪除
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">尚無版本紀錄</p>
              )}
            </div>

            <button
              onClick={() => setDetailNoteId(null)}
              className="w-full rounded-xl border-2 border-foreground bg-card px-4 py-2.5 font-bold shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)]"
            >
              關閉
            </button>
          </div>
        </div>
      ) : null}

      {showTagManager ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4" onClick={() => setShowTagManager(false)}>
          <div className="w-full max-w-md space-y-4 rounded-2xl border-2 border-foreground bg-card p-6 shadow-[6px_6px_0_0_var(--color-foreground)]" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-xl font-extrabold">管理標籤</h2>
            {feedback ? <p className="rounded-lg border-2 border-foreground bg-accent/10 px-3 py-2 text-sm font-medium text-muted-foreground">{feedback}</p> : null}
            <div className="flex gap-2">
              <input
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                placeholder="新標籤名稱"
                className="flex-1 rounded-xl border-2 border-foreground bg-card px-3 py-2 shadow-[2px_2px_0_0_var(--color-foreground)]"
                onKeyDown={(event) => event.key === "Enter" && addTag()}
              />
              <button onClick={addTag} className="rounded-xl border-2 border-foreground bg-primary px-4 py-2 font-bold text-background shadow-[2px_2px_0_0_var(--color-foreground)]">新增</button>
            </div>
            <ul className="max-h-64 space-y-1.5 overflow-y-auto">
              {tags.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">尚無標籤</p>
              ) : (
                tags.map((tag) => (
                  <li key={tag} className="flex items-center justify-between rounded-xl border-2 border-foreground bg-muted px-3 py-2 text-sm">
                    <span className="font-semibold">{tag}</span>
                    <button onClick={() => deleteTag(tag)} className="rounded-lg border-2 border-foreground bg-destructive px-2.5 py-1 text-xs font-bold text-background shadow-[2px_2px_0_0_var(--color-foreground)]">刪除</button>
                  </li>
                ))
              )}
            </ul>
            <button onClick={() => setShowTagManager(false)} className="w-full rounded-xl border-2 border-foreground bg-card px-4 py-2.5 font-bold shadow-[3px_3px_0_0_var(--color-foreground)]">關閉</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
