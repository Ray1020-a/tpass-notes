"use client";

import { useState } from "react";

export function PdfViewer({ fileUrl, fileName }: { fileUrl: string; fileName?: string }) {
  const [fullscreen, setFullscreen] = useState(false);

  const apiUrl = `/api/files/${fileUrl.split("/").pop()}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-foreground bg-muted p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <svg className="h-5 w-5 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="font-semibold text-foreground">{fileName || "PDF 文件"}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={apiUrl}
            download
            className="rounded-lg border-2 border-foreground bg-card px-3 py-1.5 font-mono text-xs font-bold shadow-[2px_2px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[1px_1px_0_0_var(--color-foreground)]"
          >
            下載
          </a>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="rounded-lg border-2 border-foreground bg-card px-3 py-1.5 font-mono text-xs font-bold shadow-[2px_2px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[1px_1px_0_0_var(--color-foreground)]"
          >
            {fullscreen ? "還原" : "全螢幕"}
          </button>
        </div>
      </div>
        <div className={`${fullscreen ? "fixed inset-0 z-[200] bg-background p-4" : ""}`}>
        <div className={`${fullscreen ? "h-full w-full" : "h-[80vh]"} rounded-xl border-2 border-foreground bg-card overflow-hidden`}>
          <iframe
            src={apiUrl}
            className="h-full w-full"
            title={fileName || "PDF 閱讀器"}
          />
        </div>
        {fullscreen ? (
          <button
            onClick={() => setFullscreen(false)}
            className="fixed right-6 top-6 z-[201] rounded-xl border-2 border-foreground bg-card px-4 py-2 font-bold shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)]"
          >
            關閉全螢幕
          </button>
        ) : null}
      </div>
    </div>
  );
}
