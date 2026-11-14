import { db, databaseConfigured } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { bucket, s3 } from "@/lib/storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { guestUploadKey } from "@/lib/guest-listing";
import { createShareImage } from "@/lib/share-image";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!databaseConfigured) return new Response(null, { status: 404 });
  const { id } = await params;
  const media = await db().media.findUnique({ where: { id } });
  if (!media) return new Response(null, { status: 404 });
  const published = await db().property.count({
    where: { status: "PUBLISHED", gallery: { has: `/api/media/${id}` } },
  });
  const publicTeamPhoto = await db().teamMember.count({
    where: { photoId: id, active: true },
  });
  const publicTestimonialPhoto = await db().testimonial.count({
    where: { photoId: id, active: true },
  });
  const isPublic = Boolean(
    published || publicTeamPhoto || publicTestimonialPhoto,
  );
  if (!isPublic) {
    const user = await currentUser();
    const guestKey = user ? null : await guestUploadKey();
    const ownGuestUpload =
      !media.ownerId && Boolean(guestKey && guestKey === media.guestKey);
    if (
      !ownGuestUpload &&
      (!user || (user.id !== media.ownerId && user.role !== "ADMIN"))
    )
      return new Response(null, { status: 404 });
  }
  try {
    const object = await s3().send(
      new GetObjectCommand({ Bucket: bucket, Key: media.key }),
    );
    if (!object.Body) return new Response(null, { status: 404 });
    const share = new URL(request.url).searchParams.get("variant") === "share";
    const body = share
      ? new Uint8Array(
          await createShareImage(await object.Body.transformToByteArray()),
        )
      : object.Body.transformToWebStream();
    return new Response(body, {
      headers: {
        "Content-Type": share ? "image/jpeg" : "image/webp",
        "Cache-Control": isPublic
          ? "public, max-age=300, stale-while-revalidate=3600"
          : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
