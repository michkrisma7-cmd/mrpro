import { Partnership } from "@/components/partnership";
import { pageMetadata } from "@/lib/seo";
import "./partnership.css";
export const metadata = pageMetadata({
  title: "Kemitraan Tukang dan Teknisi",
  description:
    "Bergabung sebagai mitra MR Properti untuk perbaikan dan renovasi rumah di Cikarang, Bekasi, Karawang, dan Cikampek.",
  path: "/kemitraan",
});
export default function PartnershipPage() {
  return <Partnership />;
}
