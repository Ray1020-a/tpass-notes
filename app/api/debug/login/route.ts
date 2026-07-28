import { NextResponse } from "next/server";
import { signDemoToken } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const token = await signDemoToken({
    sub: "demo-user",
    email: "11454@tschool.tp.edu.tw",
    name: "王大貴",
    permissions: {
      notes: { read: true, role: "admin", restriction: "none" },
    },
  });

  const response = NextResponse.redirect(new URL(safeNext, process.env.SERVICE_SELF_URL || "http://127.0.0.1:3000"), 303);
  response.cookies.set("tpass_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
