import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { partnerSchema } from "@/lib/partner-validation";
import { registrationOriginAllowed } from "@/lib/auth-origin";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN")
    return NextResponse.json(
      { error: "Akses khusus administrator." },
      { status: user ? 403 : 401 },
    );
  if (!registrationOriginAllowed(request, process.env))
    return NextResponse.json(
      { error: "Asal permintaan tidak diizinkan." },
      { status: 403 },
    );
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Data perubahan tidak valid." },
      { status: 400 },
    );
  }
  const parsed = partnerSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  try {
    await db().partner.update({
      where: { id: (await params).id },
      data: parsed.data,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Perubahan belum berhasil disimpan. Silakan coba lagi." },
      { status: 503 },
    );
  }
}
