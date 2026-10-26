// Property.whatsapp is currently the listing's only public contact number.
export function listingContactNumber(value: string) {
  if (!/^\+?[\d\s().-]+$/.test(value.trim())) return null;
  let number = value.replace(/\D/g, "");
  if (number.startsWith("0")) number = `62${number.slice(1)}`;
  return /^62[1-9]\d{7,12}$/.test(number) ? number : null;
}

export function listingWhatsappLink(
  number: string,
  title: string,
  url: string,
) {
  const message = `Halo, saya tertarik dengan properti ${title}. Apakah masih tersedia? ${url}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
