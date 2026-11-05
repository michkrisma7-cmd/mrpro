import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFields } from "@/lib/data";
import { storageConfigured } from "@/lib/storage";
import { PropertyForm } from "@/components/property-form";
import type { Listing, Values } from "@/lib/types";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Edit Listing",
  robots: { index: false, follow: false },
};
export default async function EditListing({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [property, fields] = await Promise.all([
    db().property.findFirst({ where: { id, ownerId: user.id } }),
    getFields(),
  ]);
  if (!property) notFound();
  return (
    <div className="container page-wrap member-property-edit">
      <Link href="/akun" className="text-button">
        Kembali ke Kelola Listing
      </Link>
      <div className="page-heading">
        <h1>Edit Listing</h1>
        <p>{property.title}</p>
      </div>
      <PropertyForm
        key={property.id}
        fields={fields}
        enabled
        uploadEnabled={storageConfigured}
        property={{ ...property, values: property.values as Values } as Listing}
      />
    </div>
  );
}
