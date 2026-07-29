import Link from "next/link";
import { canManage, getSession, getPermissionEntry } from "@/lib/auth";
import { AccessGate } from "@/components/access-gate";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const permission = getPermissionEntry(session);
  const userName = session?.name || "訪客";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AccessGate restriction={permission.restriction} reason={permission.reason} />
      <header className="sticky top-0 z-50 border-b-2 border-foreground bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="font-mono text-lg font-extrabold tracking-tight text-foreground transition-opacity hover:opacity-70"
          >
            T<span className="text-primary">-</span>Pass Notes
          </Link>
          <div className="flex items-center gap-2">
            {canManage(session) ? (
              <Link
                href="/panel"
                className="rounded-xl border-2 border-foreground bg-accent/10 px-3.5 py-2 text-sm font-bold shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)]"
              >
                管理面板
              </Link>
            ) : null}
            <div className="rounded-xl border-2 border-foreground bg-card px-3.5 py-2 shadow-[3px_3px_0_0_var(--color-foreground)]">
              <div className="text-sm font-bold leading-tight">{userName}</div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{permission.role}</div>
            </div>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-xl border-2 border-foreground bg-destructive px-3.5 py-2 text-sm font-bold text-background shadow-[3px_3px_0_0_var(--color-foreground)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-foreground)]"
              >
                登出
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
