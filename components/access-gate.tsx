"use client";

import { useEffect, useState } from "react";

export function AccessGate({ restriction, reason }: { restriction?: string; reason?: string }) {
  const [open, setOpen] = useState(restriction === "warning");

  useEffect(() => {
    if (restriction === "warning") {
      const timer = window.setTimeout(() => setOpen(false), 5000);
      return () => window.clearTimeout(timer);
    }
    if (restriction === "ban") {
      window.location.replace("https://portal.tschoolsu.org/");
    }
    return undefined;
  }, [restriction]);

  if (restriction === "ban") return null;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[oklch(0.99_0.002_250)]/80 p-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.05_60)] p-6 shadow-[6px_6px_0_0_var(--color-foreground)]">
        <h2 className="text-xl font-extrabold">提醒</h2>
        <p className="mt-3 text-sm">{reason || "您目前處於警告狀態，請稍後再繼續使用。"}</p>
        <p className="mt-4 text-sm font-semibold">5 秒後將自動關閉。</p>
        <button onClick={() => setOpen(false)} className="mt-5 rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] px-4 py-2 font-semibold shadow-[3px_3px_0_0_var(--color-foreground)]">
          立即關閉
        </button>
      </div>
    </div>
  );
}
