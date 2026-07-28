"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
    const res = await fetch(`/api/notes/${noteId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ published: !published }) });
    if (res.ok) {
      setNotes((prev) => prev.map((note) => (note.id === noteId ? { ...note, published: !published } : note)));
    }
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
            <p className="mt-1 text-sm text-[oklch(0.5_0.012_264)]">{isAdmin ? "您是最高管理員，可管理所有筆記。" : "您可編輯與管理自己的筆記。"}</p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="搜尋標題或作者" className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] px-3 py-2 shadow-[3px_3px_0_0_var(--color-foreground)]" />
            <select multiple value={selectedTags} onChange={(event) => setSelectedTags(Array.from(event.target.selectedOptions, (option) => option.value))} className="min-h-10 rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] px-3 py-2 shadow-[3px_3px_0_0_var(--color-foreground)]">
              {tags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <button onClick={() => setCreating(true)} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.62_0.16_150)] px-4 py-2 font-semibold text-[oklch(0.99_0_0)] shadow-[3px_3px_0_0_var(--color-foreground)]">
              新增筆記
            </button>
          </div>
        </div>
      </section>
      {creating ? (
        <div className="rounded-2xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] p-5 shadow-[4px_4px_0_0_var(--color-foreground)]">
          <h2 className="text-xl font-extrabold">新增筆記</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="筆記標題" className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] px-3 py-2" />
            <select value={contentType} onChange={(event) => setContentType(event.target.value)} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] px-3 py-2">
              <option value="markdown">MarkDown</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          <div className="mt-3">
            <label className="text-sm font-semibold">標籤</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button key={tag} onClick={() => setNewTags((prev) => prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag])} className={`rounded-full border-2 px-3 py-1 text-sm ${newTags.includes(tag) ? "bg-[oklch(0.62_0.16_150)] text-[oklch(0.99_0_0)]" : "bg-[oklch(1_0_0)]"}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={createNote} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.62_0.16_150)] px-4 py-2 font-semibold text-[oklch(0.99_0_0)]">建立</button>
            <button onClick={() => setCreating(false)} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.04_250)] px-4 py-2 font-semibold">取消</button>
          </div>
        </div>
      ) : null}
      <section className="grid gap-4">
        {notes.map((note) => (
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
                {isAdmin ? <p className="mt-1 text-sm text-[oklch(0.5_0.012_264)]">擁有者：{note.owner_name}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/read?id=${note.id}`} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.04_250)] px-3 py-2 font-semibold shadow-[3px_3px_0_0_var(--color-foreground)]">
                  閱讀
                </Link>
                <Link href={`/editor?id=${note.id}`} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.62_0.16_150)] px-3 py-2 font-semibold text-[oklch(0.99_0_0)] shadow-[3px_3px_0_0_var(--color-foreground)]">
                  編輯
                </Link>
                <button onClick={() => togglePublish(note.id, note.published)} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.05_60)] px-3 py-2 font-semibold">
                  {note.published ? "下架" : "上架"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
