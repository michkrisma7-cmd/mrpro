import Link from "next/link";
import { cookies } from "next/headers";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicationCookie } from "@/lib/publication-flash";
import { dismissPublication } from "@/lib/publication-actions";
export async function PublicationNotice() {
  const id = (await cookies()).get(publicationCookie)?.value;
  if (!id || !/^[a-z0-9-]{1,100}$/i.test(id)) return null;
  const user = await currentUser();
  if (!user) return null;
  const listing = await db().property.findFirst({
    where: { id, ownerId: user.id, status: "PUBLISHED" },
    select: { slug: true },
  });
  if (!listing) return null;
  return (
    <div className="container publication-notice" role="status">
      <strong>Properti berhasil tayang</strong>
      <div>
        <Link href={`/properti/${listing.slug}`}>Lihat Iklan</Link>
        <Link href="/akun">Kelola Listing</Link>
      </div>
      <form action={dismissPublication}>
        <button
          type="submit"
          className="text-button"
          aria-label="Tutup pesan berhasil tayang"
        >
          Tutup
        </button>
      </form>
    </div>
  );
}
