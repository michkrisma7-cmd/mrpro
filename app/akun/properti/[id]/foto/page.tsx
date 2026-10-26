import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { storageConfigured } from "@/lib/storage";
import { PropertyPhotoEditor } from "@/components/property-photo-editor";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Edit foto properti",
  robots: { index: false, follow: false },
};
export default async function EditPhotos({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const property = await db().property.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!property) notFound();
  return (
    <div className="container page-wrap">
      <Link href="/akun">Kembali ke akun</Link>
      <h1>Edit foto properti</h1>
      <h2>{property.title}</h2>
      <PropertyPhotoEditor
        id={id}
        gallery={property.gallery}
        uploadEnabled={storageConfigured}
      />
    </div>
  );
}
