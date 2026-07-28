import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.redirect(process.env.AUTH_LOGOUT_URL || "https://portal.tschoolsu.org/", 303);
  response.cookies.set("tpass_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });
  return response;
}
