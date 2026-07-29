import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.redirect("https://portal.tschoolsu.org/", 303);
  response.cookies.set("tpass_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SERVICE_SELF_URL?.startsWith("https://") ?? false,
    path: "/",
    maxAge: 0,
  });
  return response;
}
