import Link from "next/link";
import { canManage, getSession, getPermissionEntry } from "@/lib/auth";
import { AccessGate } from "@/components/access-gate";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const permission = getPermissionEntry(session);
  const userName = session?.name || "訪客";

  return (
    <div className="min-h-screen bg-[oklch(0.99_0.002_250)] text-[oklch(0.21_0.01_264)]">
      <AccessGate restriction={permission.restriction} reason={permission.reason} />
      <header className="sticky top-0 z-50 border-b-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.99_0.002_250)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link href="/" className="font-mono text-lg font-extrabold tracking-tight text-[oklch(0.21_0.01_264)]">
            T<span className="text-[oklch(0.62_0.16_150)]">-</span>Pass Notes
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            {canManage(session) ? (
              <Link
                href="/panel"
                className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.96_0.04_250)] px-3 py-2 font-semibold shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)]"
              >
                管理面板
              </Link>
            ) : null}
            <div className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(1_0_0)] px-3 py-2 shadow-[3px_3px_0_0_var(--color-foreground)]">
              <div className="text-sm font-semibold">{userName}</div>
              <div className="text-xs text-[oklch(0.5_0.012_264)]">{permission.role}</div>
            </div>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-xl border-2 border-[oklch(0.21_0.01_264)] bg-[oklch(0.58_0.2_25)] px-3 py-2 font-semibold text-[oklch(0.99_0_0)] shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)]"
              >
                登出
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
