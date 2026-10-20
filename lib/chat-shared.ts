export const handoffReply =
  "Biar informasinya tepat, yuk lanjut ke tim MR Properti lewat WhatsApp. Tim kami bisa bantu cek kebutuhan dan detailnya langsung.";
export const unavailableReply =
  "Chat sedang belum bisa menjawab. Yuk hubungi tim MR Properti lewat WhatsApp supaya tetap bisa dibantu.";
export const scopeReply =
  "Chat ini khusus membantu informasi properti dan layanan MR Properti. Untuk kebutuhan lain atau bantuan lebih lanjut, yuk hubungi tim kami lewat WhatsApp.";
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
