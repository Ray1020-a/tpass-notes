import { NextResponse } from "next/server";
import { loginUrlFor } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(loginUrlFor(safeNext), 303);
}
