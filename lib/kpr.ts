export type KprBank = "btn" | "bsi";

export type KprInput = {
  bank: KprBank;
  price: number;
  downPaymentPercent: number;
  years: number;
  annualRate: number;
  fixedYears: number;
  floatingRate: number;
};

export function validateKpr(input: KprInput): string | null {
  if (
    ![
      input.price,
      input.downPaymentPercent,
      input.years,
      input.annualRate,
      input.fixedYears,
      input.floatingRate,
    ].every(Number.isFinite)
  )
    return "Lengkapi semua angka untuk melihat simulasi.";
  if (input.price < 1 || input.price > 1_000_000_000_000)
    return "Harga properti harus antara Rp1 dan Rp1 triliun.";
  if (input.downPaymentPercent < 0 || input.downPaymentPercent >= 100)
    return "Uang muka harus mulai 0% dan kurang dari 100%.";
  if (!Number.isInteger(input.years) || input.years < 5 || input.years > 25)
    return "Pilih tenor antara 5 dan 25 tahun.";
  if (
    input.annualRate < 0 ||
    input.annualRate > 50 ||
    (input.bank === "btn" &&
      (input.floatingRate < 0 || input.floatingRate > 50))
  )
    return "Bunga atau margin ekuivalen harus antara 0% dan 50% per tahun.";
  if (
    input.bank === "btn" &&
    (!Number.isInteger(input.fixedYears) ||
      input.fixedYears < 1 ||
      input.fixedYears > 25)
  )
    return "Masa bunga tetap harus antara 1 dan 25 tahun.";
  return null;
}

/** Monthly annuity at an annual nominal rate, without premature rounding. */
export function monthlyAnnuity(
  principal: number,
  annualRate: number,
  months: number,
) {
  if (annualRate === 0) return principal / months;
  const monthlyRate = annualRate / 1200;
  return (
    (principal * monthlyRate) / -Math.expm1(-months * Math.log1p(monthlyRate))
  );
}

export function calculateKpr(input: KprInput) {
  const error = validateKpr(input);
  if (error) throw new RangeError(error);
  const downPayment = (input.price * input.downPaymentPercent) / 100;
  const principal = input.price - downPayment;
  const months = input.years * 12;
  const initialMonths =
    input.bank === "btn" ? Math.min(input.fixedYears * 12, months) : months;
  const initialMonthly = monthlyAnnuity(principal, input.annualRate, months);
  // Replay the fixed period to calculate the balance when the rate changes.
  let outstanding = principal;
  for (let month = 0; month < initialMonths; month++)
    outstanding = Math.max(
      0,
      outstanding * (1 + input.annualRate / 1200) - initialMonthly,
    );
  const remainingMonths = months - initialMonths;
  const subsequentMonthly = remainingMonths
    ? monthlyAnnuity(outstanding, input.floatingRate, remainingMonths)
    : initialMonthly;
  const totalInstallments =
    initialMonthly * initialMonths + subsequentMonthly * remainingMonths;
  return {
    downPayment,
    principal,
    months,
    initialMonths,
    remainingMonths,
    initialMonthly,
    subsequentMonthly,
    totalInstallments,
    financingCost: Math.max(0, totalInstallments - principal),
    totalWithDownPayment: downPayment + totalInstallments,
  };
}

export const kprBanks = [
  {
    id: "btn" as const,
    name: "Bank BTN",
    product: "KPR Konvensional",
    url: "https://www.btn.co.id/",
    requirements: [
      "Warga Negara Indonesia; siapkan KTP pemohon dan pasangan, Kartu Keluarga, serta surat nikah atau cerai bila ada.",
      "Memenuhi batas usia pengajuan dan usia saat kredit lunas. Tenor disesuaikan dengan usia, pekerjaan, dan kebijakan BTN.",
      "Memiliki penghasilan yang dapat diverifikasi. Siapkan slip gaji dan surat keterangan kerja untuk pegawai, atau dokumen usaha/profesi serta bukti penghasilan untuk wiraswasta/profesional.",
      "Siapkan NPWP/dokumen perpajakan sesuai ketentuan serta rekening koran atau tabungan beberapa bulan terakhir sesuai permintaan bank.",
      "Properti harus lolos penilaian dan pemeriksaan legalitas. Dokumen dapat meliputi sertifikat, PBG/IMB, PBB, dan dokumen jual beli.",
      "Pengajuan melalui pemeriksaan SLIK OJK, kemampuan membayar, serta persetujuan kredit BTN. DP, bunga, biaya, dan tenor final mengikuti penawaran bank.",
    ],
  },
  {
    id: "bsi" as const,
    name: "Bank BSI",
    product: "KPR Syariah · BSI Griya",
    url: "https://www.bankbsi.co.id/",
    requirements: [
      "Warga Negara Indonesia; siapkan KTP pemohon dan pasangan, Kartu Keluarga, serta surat nikah atau cerai bila ada.",
      "Memenuhi ketentuan usia dan penghasilan BSI Griya. Tenor yang disetujui mempertimbangkan usia saat lunas dan jenis pekerjaan.",
      "Memiliki penghasilan yang dapat diverifikasi. Siapkan slip gaji/surat kerja atau dokumen usaha/profesi dan bukti penghasilan sesuai kategori pemohon.",
      "Siapkan NPWP/dokumen perpajakan dan mutasi rekening beberapa bulan terakhir sesuai persyaratan yang diminta BSI.",
      "Objek pembiayaan harus memenuhi ketentuan bank dan prinsip syariah, serta lolos pemeriksaan legalitas dan penilaian agunan.",
      "Lolos pemeriksaan SLIK OJK dan analisis kemampuan membayar. Akad, margin/ujrah, pola angsuran, uang muka, serta biaya disepakati dalam penawaran dan akad BSI.",
    ],
  },
];
