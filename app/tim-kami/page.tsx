import Link from "next/link";
import { TeamProfiles } from "@/components/team-profiles";
import { UsersRound } from "lucide-react";
import { getTeamMembers } from "@/lib/team";
import { pageMetadata } from "@/lib/seo";
export const dynamic = "force-dynamic";
export const metadata = pageMetadata({
  title: "Tim Kami — Kenali Tenaga MR Properti",
  description:
    "Kenali tim MR Properti, bidang keahlian, dan pengalaman kerja mereka dalam membantu kebutuhan properti serta perbaikan rumah Anda.",
  path: "/tim-kami",
});
export default async function TeamPage() {
  const members = await getTeamMembers();
  return (
    <div className="container page-wrap">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Beranda</Link>
        <span>/</span>
        <span aria-current="page">Tim Kami</span>
      </nav>
      <header className="page-heading">
        <p className="eyebrow">KENALI ORANG DI BALIK PEKERJAAN KAMI</p>
        <h1>Tim Kami</h1>
        <p>
          Keahlian yang saling melengkapi untuk membantu kebutuhan properti dan
          kenyamanan rumah Anda.
        </p>
      </header>
      {members.length ? (
        <TeamProfiles members={members} />
      ) : (
        <div className="empty-state">
          <UsersRound size={40} aria-hidden="true" />
          <h2>Profil tim segera hadir.</h2>
          <p>Kami sedang menyiapkan informasi anggota tim untuk Anda.</p>
          <Link href="/layanan" className="outline-button">
            Lihat layanan kami
          </Link>
        </div>
      )}
    </div>
  );
}
