import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse(null, { status: 404 });

  const { name } = await params;
  const safeName = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safeName) return new NextResponse(null, { status: 404 });

  const filePath = path.join(process.cwd(), "public", "uploads", safeName);

  try {
    const bytes = await readFile(filePath);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
