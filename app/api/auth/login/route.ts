import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (process.env.AUTH_DEV_MODE === "true") {
    return NextResponse.redirect(`/api/debug/login?next=${encodeURIComponent(safeNext)}`, 303);
  }

  const target = new URL(process.env.AUTH_LOGIN_URL || "https://auth.tschoolsu.org/login");
  target.searchParams.set("next", safeNext);
  return NextResponse.redirect(target, 303);
}
