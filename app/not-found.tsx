import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border-2 border-foreground bg-card p-8 shadow-[6px_6px_0_0_var(--color-foreground)]">
        <p className="font-mono text-6xl font-extrabold tracking-tighter text-primary">404</p>
        <h1 className="mt-4 text-2xl font-extrabold">找不到頁面</h1>
        <p className="mt-2 text-sm text-muted-foreground">你要尋找的頁面不存在或已被移除。</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl border-2 border-foreground bg-accent/10 px-5 py-2.5 font-bold shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)]"
        >
          ← 返回首頁
        </Link>
      </div>
    </div>
  );
}
