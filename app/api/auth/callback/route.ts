import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const token = form.get("token");
  const next = form.get("next")?.toString() || "/";

  if (typeof token !== "string" || !token) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const claims = await verifySession(token);
  if (!claims) {
    return new NextResponse("Invalid token", { status: 401 });
  }

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const response = NextResponse.redirect(new URL(safeNext, process.env.SERVICE_SELF_URL || "http://127.0.0.1:3000"), 303);
  response.cookies.set("tpass_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.SERVICE_SELF_URL || "").startsWith("https://"),
    path: "/",
    maxAge: Math.max(0, claims.exp - Math.floor(Date.now() / 1000)),
  });

  return response;
}
