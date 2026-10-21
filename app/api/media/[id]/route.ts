import { db, databaseConfigured } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { bucket, s3 } from "@/lib/storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
export async function GET(
  _: Request,
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
  const isPublic = Boolean(published || publicTeamPhoto);
  if (!isPublic) {
    const user = await currentUser();
    if (!user || (user.id !== media.ownerId && user.role !== "ADMIN"))
      return new Response(null, { status: 404 });
  }
  try {
    const object = await s3().send(
      new GetObjectCommand({ Bucket: bucket, Key: media.key }),
    );
    if (!object.Body) return new Response(null, { status: 404 });
    return new Response(object.Body.transformToWebStream(), {
      headers: {
        "Content-Type": "image/webp",
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
