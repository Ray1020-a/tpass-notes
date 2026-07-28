import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-2xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.04_250)] p-8 shadow-[4px_4px_0_0_var(--color-foreground)]">
      <h1 className="text-2xl font-extrabold">404</h1>
      <p className="mt-3">找不到這個頁面。</p>
      <Link href="/" className="mt-6 inline-flex rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] px-4 py-2 font-semibold shadow-[3px_3px_0_0_var(--color-foreground)]">
        返回首頁
      </Link>
    </div>
  );
}
