"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function EditorPage() {
  const params = useSearchParams();
  const id = params.get("id");
  const [content, setContent] = useState("# 新筆記\n\n請在這裡輸入內容。\n");
  const [mode, setMode] = useState<"edit" | "preview" | "split">("split");

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!id) return;
      fetch("/api/notes/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, content, mode }),
      }).catch(() => undefined);
    }, 60000);
    return () => window.clearInterval(interval);
  }, [content, id, mode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!id) return;
        fetch("/api/notes/save", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, content, mode }),
        }).catch(() => undefined);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [content, id, mode]);

  const preview = useMemo(() => content, [content]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.04_250)] p-5 shadow-[4px_4px_0_0_var(--color-foreground)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[oklch(0.46_0.15_250)]">Markdown 編輯器</p>
          <h1 className="text-2xl font-extrabold">協作編輯</h1>
        </div>
        <div className="flex gap-2">
          {(["edit", "preview", "split"] as const).map((value) => (
            <button key={value} onClick={() => setMode(value)} className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] px-3 py-2 font-semibold shadow-[3px_3px_0_0_var(--color-foreground)]">
              {value === "edit" ? "全編輯" : value === "preview" ? "全預覽" : "分欄"}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] p-4 shadow-[4px_4px_0_0_var(--color-foreground)]">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[oklch(0.5_0.012_264)]">
          <span>格式提示：# 標題、- 清單、**粗體**、```程式碼</span>
        </div>
        {mode === "preview" ? (
          <div className="min-h-[60vh] whitespace-pre-wrap rounded-xl border-2 border-[oklch(0.21_0.01_264)] p-4">{preview}</div>
        ) : mode === "edit" ? (
          <textarea value={content} onChange={(event) => setContent(event.target.value)} className="min-h-[60vh] w-full rounded-xl border-2 border-[oklch(0.21_0.01_264)] p-4 font-mono" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <textarea value={content} onChange={(event) => setContent(event.target.value)} className="min-h-[60vh] w-full rounded-xl border-2 border-[oklch(0.21_0.01_264)] p-4 font-mono" />
            <div className="min-h-[60vh] whitespace-pre-wrap rounded-xl border-2 border-[oklch(0.21_0.01_264)] p-4">{preview}</div>
          </div>
        )}
      </div>
    </div>
  );
}
