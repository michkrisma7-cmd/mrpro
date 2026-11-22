export const handoffReply =
  "Biar informasinya tepat, yuk lanjut ke tim MR Properti lewat WhatsApp. Tim kami bisa bantu cek kebutuhan dan detailnya langsung.";
export const unavailableReply =
  "Chat sedang belum bisa menjawab. Yuk hubungi tim MR Properti lewat WhatsApp supaya tetap bisa dibantu.";
export const scopeReply =
  "Chat ini khusus membantu informasi properti dan layanan MR Properti. Untuk kebutuhan lain atau bantuan lebih lanjut, yuk hubungi tim kami lewat WhatsApp.";
// Harga cuci/service AC belum dipublikasikan (22-11-2026): selalu oper ke admin.
export const acPriceReply =
  "Harga cuci dan service AC belum tercantum, Kak. Silakan tanya langsung ke admin MR Properti lewat WhatsApp 08811063079, nanti dibantu cek harganya.";
export type ChatSource = {
  id: string;
  title: string;
  path: string;
  text: string;
};
export type ChatAnswer = {
  reply: string;
  handoff: boolean;
  sources: { title: string; path: string }[];
  whatsappUrl: string | null;
};
