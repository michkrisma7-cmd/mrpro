import { db, databaseConfigured } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { bucket, s3 } from "@/lib/storage";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { guestUploadKey } from "@/lib/guest-listing";
import { optimizeDisplay } from "@/lib/image-upload";
import { displayImageKey } from "@/lib/image-variants";

const pendingDisplays = new Map<string, Promise<Buffer>>();

function missingObject(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const detail = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    detail.$metadata?.httpStatusCode === 404 ||
    detail.name === "NoSuchKey" ||
    detail.name === "NotFound"
  );
}

function unavailable(status: number) {
  return new Response(null, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Cloudflare-CDN-Cache-Control": "private, no-store",
    },
  });
}

async function loadDisplay(masterKey: string): Promise<Buffer> {
  const Key = displayImageKey(masterKey);
  try {
    const object = await s3().send(
      new GetObjectCommand({ Bucket: bucket, Key }),
    );
    if (object.Body)
      return Buffer.from(await object.Body.transformToByteArray());
  } catch (error) {
    const detail = error as { $metadata?: { httpStatusCode?: number } } | null;
    // S3 can report a missing key as 403 when ListBucket is not granted.
    // Authorization already succeeded; try the known master before failing.
    if (!missingObject(error) && detail?.$metadata?.httpStatusCode !== 403)
      throw error;
  }
  // Older uploads have no display copy. Create it once and reuse it thereafter.
  const master = await s3().send(
    new GetObjectCommand({ Bucket: bucket, Key: masterKey }),
  );
  if (!master.Body) throw new Error("Media body missing");
  const output = await optimizeDisplay(
    Buffer.from(await master.Body.transformToByteArray()),
  );
  try {
    await s3().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key,
        Body: output,
        ContentType: "image/webp",
      }),
    );
  } catch {
    // A temporary storage write failure must not hide an otherwise valid photo.
  }
  return output;
}

async function displayImage(masterKey: string): Promise<Buffer> {
  const pending = pendingDisplays.get(masterKey);
  if (pending) return pending;
  const work = loadDisplay(masterKey);
  // Bound the bookkeeping; this map holds only in-flight work, never image cache.
  if (pendingDisplays.size >= 32) return work;
  pendingDisplays.set(masterKey, work);
  try {
    return await work;
  } finally {
    pendingDisplays.delete(masterKey);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!databaseConfigured) return unavailable(404);
  const variant = new URL(request.url).searchParams.get("variant");
  if (variant !== null && variant !== "display") return unavailable(400);
  const { id } = await params;
  const [media, published] = await Promise.all([
    db().media.findUnique({ where: { id } }),
    db().property.count({
      where: { status: "PUBLISHED", gallery: { has: `/api/media/${id}` } },
    }),
  ]);
  if (!media) return unavailable(404);
  let isPublic = Boolean(published);
  if (!isPublic) {
    const [team, testimonial] = await Promise.all([
      db().teamMember.count({ where: { photoId: id, active: true } }),
      db().testimonial.count({ where: { photoId: id, active: true } }),
    ]);
    isPublic = Boolean(team || testimonial);
  }
  if (!isPublic) {
    const user = await currentUser();
    const guestKey = user ? null : await guestUploadKey();
    const ownGuestUpload =
      !media.ownerId && Boolean(guestKey && guestKey === media.guestKey);
    if (
      !ownGuestUpload &&
      (!user || (user.id !== media.ownerId && user.role !== "ADMIN"))
    )
      return unavailable(404);
  }
  const headers: Record<string, string> = {
    "Content-Type": "image/webp",
    "Cache-Control": isPublic
      ? "public, max-age=300, stale-while-revalidate=3600"
      : "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  try {
    if (variant === "display") {
      // Browsers revalidate, while Cloudflare may keep public photos for five
      // minutes. Private/error responses never enter either shared cache.
      headers["Cache-Control"] = isPublic
        ? "private, no-cache"
        : "private, no-store";
      headers["Cloudflare-CDN-Cache-Control"] = isPublic
        ? "public, max-age=300, must-revalidate"
        : "private, no-store";
      const display = await displayImage(media.key);
      return new Response(new Uint8Array(display), {
        headers: { ...headers, "Content-Length": String(display.length) },
      });
    }
    const object = await s3().send(
      new GetObjectCommand({ Bucket: bucket, Key: media.key }),
    );
    if (!object.Body) return unavailable(404);
    return new Response(object.Body.transformToWebStream(), {
      headers,
    });
  } catch (error) {
    return unavailable(missingObject(error) ? 404 : 502);
  }
}
