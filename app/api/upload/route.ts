import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { bucket, s3, storageConfigured } from "@/lib/storage";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { optimizeUpload } from "@/lib/image-upload";
import { boundedFormData } from "@/lib/upload-body";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const expectedOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  let sameOrigin = false;
  try {
    const incoming = new URL(origin || "");
    sameOrigin = expectedOrigin
      ? incoming.origin === new URL(expectedOrigin).origin
      : ["http:", "https:"].includes(incoming.protocol) &&
        incoming.host === request.headers.get("host");
  } catch {
    /* Missing or malformed origins are rejected. */
  }
  if (!sameOrigin)
    return Response.json({ error: "Origin tidak valid." }, { status: 403 });
  const user = await currentUser();
  if (!user)
    return Response.json(
      { error: "Silakan login sebelum mengunggah." },
      { status: 401 },
    );
  if (!storageConfigured)
    return Response.json(
      { error: "Penyimpanan foto belum tersedia. Hubungi admin." },
      { status: 503 },
    );
  if (Number(request.headers.get("content-length")) > 6 * 1024 * 1024)
    return Response.json(
      { error: "Ukuran file maksimal 5 MB." },
      { status: 413 },
    );
  const recent = await db().media.count({
    where: {
      ownerId: user.id,
      createdAt: { gte: new Date(Date.now() - 3600000) },
    },
  });
  if (recent >= 36)
    return Response.json(
      { error: "Batas unggahan per jam tercapai. Coba lagi nanti." },
      { status: 429 },
    );
  let buffer: Buffer;
  try {
    const file = (await boundedFormData(request)).get("file");
    if (
      !(file instanceof File) ||
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      return Response.json(
        { error: "Gunakan JPG, PNG, atau WebP, maksimal 5 MB." },
        { status: 400 },
      );
    buffer = await optimizeUpload(Buffer.from(await file.arrayBuffer()));
  } catch {
    return Response.json(
      { error: "Gambar tidak valid atau terlalu besar." },
      { status: 400 },
    );
  }
  const key = `properties/${user.id}/${crypto.randomUUID()}.webp`;
  try {
    await s3().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    try {
      const media = await db().media.create({
        data: { key, ownerId: user.id },
      });
      return Response.json({ url: `/api/media/${media.id}` });
    } catch (e) {
      await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      throw e;
    }
  } catch {
    return Response.json(
      { error: "Unggahan belum berhasil. Coba lagi." },
      { status: 502 },
    );
  }
}
