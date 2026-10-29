import { NextResponse } from "next/server";
import { z } from "zod";
import { db, databaseConfigured } from "@/lib/db";
import { partnerSchema } from "@/lib/partner-validation";
import { registrationOriginAllowed } from "@/lib/auth-origin";
export async function POST(request: Request) {
  if (!registrationOriginAllowed(request, process.env))
    return NextResponse.json(
      { error: "Asal permintaan tidak diizinkan." },
      { status: 403 },
    );
  if (!databaseConfigured)
    return NextResponse.json(
      {
        error:
          "Pendaftaran belum tersedia karena koneksi database belum dikonfigurasi. Isian Anda tetap tersimpan di formulir.",
      },
      { status: 503 },
    );
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Data pendaftaran tidak valid." },
      { status: 400 },
    );
  }
  const parsed = partnerSchema
    .extend({ submissionId: z.uuid() })
    .safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  try {
    // An unchanged request key makes retries safe after a lost network response.
    await db().partner.upsert({
      where: { submissionId: parsed.data.submissionId },
      create: parsed.data,
      update: {},
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error:
          "Pendaftaran belum berhasil disimpan. Silakan coba lagi. Isian Anda tidak dihapus.",
      },
      { status: 503 },
    );
  }
}
