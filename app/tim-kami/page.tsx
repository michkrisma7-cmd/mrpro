import Link from "next/link";
import Image from "next/image";
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
        <div className="team-grid">
          {members.map((member) => (
            <article className="team-card" key={member.id}>
              <Image
                src={`/api/media/${member.photoId}`}
                alt={`Foto ${member.name}`}
                width={480}
                height={560}
                unoptimized
                className="team-photo"
              />
              <div className="team-card-body">
                <h2>{member.name}</h2>
                <p className="team-expertise">{member.expertise}</p>
                <h3>Pengalaman kerja</h3>
                <p className="team-experience">{member.experience}</p>
              </div>
            </article>
          ))}
        </div>
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
