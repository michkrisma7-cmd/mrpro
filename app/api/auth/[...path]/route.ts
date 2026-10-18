import { handlers, authConfigured } from "@/lib/auth-server";
import type { NextRequest } from "next/server";
const unavailable = () =>
  Response.json(
    { message: "Login belum tersedia. Hubungi pengelola." },
    { status: 503 },
  );
export async function GET(request: NextRequest) {
  return authConfigured ? handlers.GET(request) : unavailable();
}
export async function POST(request: NextRequest) {
  return authConfigured ? handlers.POST(request) : unavailable();
}
