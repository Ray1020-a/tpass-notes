"use client";

import { useEffect, useState } from "react";

export function AccessGate({ restriction, reason }: { restriction?: string; reason?: string }) {
  const [open, setOpen] = useState(restriction === "warning");
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (restriction === "warning") {
      setCanClose(false);
      const closeTimer = window.setTimeout(() => setOpen(false), 5000);
      const enableTimer = window.setTimeout(() => setCanClose(true), 5000);
      return () => { window.clearTimeout(closeTimer); window.clearTimeout(enableTimer); };
    }
    if (restriction === "ban") {
      window.location.replace("https://portal.tschoolsu.org/");
    }
  }, [restriction]);

  if (restriction === "ban") return null;
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-foreground bg-secondary p-6 shadow-[4px_4px_0_0_var(--color-foreground)]">
        <h2 className="text-xl font-extrabold">提醒</h2>
        <p className="mt-3 text-sm font-medium">{reason || "你目前處於警告狀態。"}</p>
        <div className="mt-4 flex items-center gap-2">
          <div className="h-2 w-full rounded-full border-2 border-foreground bg-card">
            <div className="h-full w-full origin-left animate-shrink rounded-full bg-destructive" />
          </div>
          <span className="shrink-0 font-mono text-xs font-bold">5s</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          disabled={!canClose}
          className="mt-4 w-full rounded-xl border-2 border-foreground bg-card px-4 py-2.5 font-bold shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {canClose ? "關閉" : "請等待 5 秒…"}
        </button>
      </div>
    </div>
  );
}
