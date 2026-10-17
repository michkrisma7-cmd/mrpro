import { getAuth, authConfigured } from "@/lib/auth";
import { NextRequest } from "next/server";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (!authConfigured)
    return Response.json(
      { message: "Login belum tersedia. Hubungi pengelola." },
      { status: 503 },
    );
  return getAuth().handler().GET(request, context);
}
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (!authConfigured)
    return Response.json(
      { message: "Login belum tersedia. Hubungi pengelola." },
      { status: 503 },
    );
  return getAuth().handler().POST(request, context);
}
