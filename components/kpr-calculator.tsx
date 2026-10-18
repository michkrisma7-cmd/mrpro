"use client";

import { useState } from "react";
import { Landmark, Leaf, Check, Calculator, Info } from "lucide-react";
import {
  calculateKpr,
  validateKpr,
  type KprBank,
  type KprInput,
} from "@/lib/kpr";
import { money } from "@/lib/format";

export function KprCalculator() {
  const [bank, setBank] = useState<KprBank>("btn");
  const [price, setPrice] = useState("750000000");
  const [dp, setDp] = useState("20");
  const [years, setYears] = useState(15);
  const [btnRate, setBtnRate] = useState("8");
  const [bsiRate, setBsiRate] = useState("8");
  const [fixedYears, setFixedYears] = useState("3");
  const [floatingRate, setFloatingRate] = useState("12");
  const input: KprInput = {
    bank,
    price: price === "" ? NaN : Number(price),
    downPaymentPercent: dp === "" ? NaN : Number(dp),
    years,
    annualRate:
      (bank === "btn" ? btnRate : bsiRate) === ""
        ? NaN
        : Number(bank === "btn" ? btnRate : bsiRate),
    fixedYears:
      bank === "bsi" ? years : fixedYears === "" ? NaN : Number(fixedYears),
    floatingRate:
      bank === "bsi" ? 0 : floatingRate === "" ? NaN : Number(floatingRate),
  };
  const error = validateKpr(input);
  const result = error ? null : calculateKpr(input);
  const terms = Array.from({ length: 21 }, (_, i) => i + 5);
  const conventional = bank === "btn";

  return (
    <>
      <fieldset className="plain-fieldset kpr-bank-picker">
        <legend>1. Pilih jenis KPR Anda</legend>
        <div className="kpr-bank-options">
          {(["btn", "bsi"] as const).map((id) => (
            <label
              className={`kpr-bank-option ${bank === id ? "is-selected" : ""}`}
              key={id}
            >
              <input
                type="radio"
                name="bank"
                value={id}
                checked={bank === id}
                onChange={() => setBank(id)}
              />
              <span className="kpr-bank-icon">
                {id === "btn" ? <Landmark /> : <Leaf />}
              </span>
              <span>
                <strong>
                  {id === "btn" ? "KPR Konvensional" : "KPR Syariah"}
                </strong>
                <span>
                  {id === "btn"
                    ? "Bank BTN · bunga tetap & floating"
                    : "Bank BSI · ilustrasi angsuran tetap"}
                </span>
              </span>
              <span className="kpr-bank-check" aria-hidden="true">
                {bank === id && <Check size={15} />}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="kpr-workspace">
        <section
          className="kpr-panel kpr-inputs"
          aria-labelledby="kpr-input-title"
        >
          <div className="kpr-panel-title">
            <Calculator size={21} />
            <h2 id="kpr-input-title">2. Atur rencana Anda</h2>
          </div>
          <div className="kpr-form-grid">
            <label className="full-span">
              Harga properti (Rp)
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="1000000000000"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <small>
                {Number.isFinite(Number(price)) && price !== ""
                  ? money(Number(price))
                  : "Masukkan harga rumah yang ingin dibeli."}
              </small>
            </label>
            <label>
              Uang muka (%)
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max="99.99"
                step="0.1"
                value={dp}
                onChange={(e) => setDp(e.target.value)}
              />
              <small>DP final mengikuti persetujuan bank.</small>
            </label>
            <label>
              Tenor (tahun)
              <select
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
              >
                {terms.map((term) => (
                  <option value={term} key={term}>
                    {term} tahun
                  </option>
                ))}
              </select>
              <small>{years * 12} kali angsuran bulanan</small>
            </label>
            <label className="full-span">
              {conventional
                ? "Bunga tetap awal (% per tahun)"
                : "Margin ekuivalen efektif (% per tahun)"}
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max="50"
                step="0.01"
                value={conventional ? btnRate : bsiRate}
                onChange={(e) =>
                  conventional
                    ? setBtnRate(e.target.value)
                    : setBsiRate(e.target.value)
                }
              />
              <small>
                {conventional
                  ? "Masukkan bunga efektif tahunan dari penawaran BTN."
                  : "Gunakan margin ekuivalen efektif dari penawaran BSI, bukan persentase margin flat."}
              </small>
            </label>
            {conventional && (
              <>
                <label>
                  Masa bunga tetap (tahun)
                  <input
                    type="number"
                    min="1"
                    max="25"
                    step="1"
                    value={fixedYears}
                    onChange={(e) => setFixedYears(e.target.value)}
                  />
                </label>
                <label>
                  Asumsi floating (% per tahun)
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="50"
                    step="0.01"
                    value={floatingRate}
                    onChange={(e) => setFloatingRate(e.target.value)}
                  />
                </label>
              </>
            )}
          </div>
          <div className="kpr-assumption">
            <Info size={17} />
            <p>
              Angka bawaan adalah contoh perhitungan, bukan suku bunga atau
              margin resmi terbaru. Sesuaikan dengan penawaran bank Anda.
            </p>
          </div>
        </section>

        <section
          className="kpr-summary"
          aria-labelledby="kpr-summary-title"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="eyebrow">
            {conventional ? "BTN · KONVENSIONAL" : "BSI · SYARIAH"}
          </p>
          <h2 id="kpr-summary-title">Gambaran cicilan Anda</h2>
          {result ? (
            <>
              <p className="kpr-monthly-label">
                {conventional && result.remainingMonths
                  ? `Cicilan awal · ${result.initialMonths / 12} tahun pertama`
                  : "Estimasi cicilan tetap"}
              </p>
              <div className="kpr-monthly">
                {money(result.initialMonthly)}
                <span>/ bulan</span>
              </div>
              {conventional && result.remainingMonths > 0 && (
                <div className="kpr-floating">
                  <span>
                    Mulai bulan ke-{result.initialMonths + 1} · asumsi floating{" "}
                    {floatingRate}%
                  </span>
                  <strong>{money(result.subsequentMonthly)} / bulan</strong>
                </div>
              )}
              <div className="kpr-funding-bar" aria-hidden="true">
                <span style={{ width: `${Number(dp)}%` }} />
              </div>
              <dl className="kpr-breakdown">
                <div>
                  <dt>Uang muka ({dp}%)</dt>
                  <dd>{money(result.downPayment)}</dd>
                </div>
                <div>
                  <dt>Pokok {conventional ? "pinjaman" : "pembiayaan"}</dt>
                  <dd>{money(result.principal)}</dd>
                </div>
                <div>
                  <dt>Tenor</dt>
                  <dd>
                    {years} tahun · {result.months} bulan
                  </dd>
                </div>
                <div>
                  <dt>Estimasi total {conventional ? "bunga" : "margin"}</dt>
                  <dd>{money(result.financingCost)}</dd>
                </div>
                <div>
                  <dt>Total seluruh cicilan</dt>
                  <dd>{money(result.totalInstallments)}</dd>
                </div>
                <div className="kpr-total">
                  <dt>Total DP + cicilan</dt>
                  <dd>{money(result.totalWithDownPayment)}</dd>
                </div>
              </dl>
              <p className="kpr-summary-note">
                Belum termasuk pajak, notaris, administrasi, provisi, asuransi,
                dan biaya lain yang berlaku. Uang awal yang perlu disiapkan
                dapat lebih besar dari DP.
              </p>
            </>
          ) : (
            <p className="kpr-error" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>

      <section
        className="kpr-panel kpr-comparison"
        aria-labelledby="kpr-comparison-title"
      >
        <h2 id="kpr-comparison-title">3. Bandingkan pilihan tenor</h2>
        <p>
          Harga rumah dan uang muka yang sama, dengan jangka waktu berbeda.
          Pilih baris untuk melihat rinciannya.
        </p>
        {result ? (
          <div
            className="kpr-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Perbandingan cicilan tenor 5 sampai 25 tahun"
          >
            <table>
              <caption className="sr-only">
                Simulasi {conventional ? "BTN" : "BSI"}, harga{" "}
                {money(input.price)}, DP {dp}%
              </caption>
              <thead>
                <tr>
                  <th scope="col">Tenor</th>
                  <th scope="col">
                    {conventional
                      ? "Cicilan awal / bulan"
                      : "Cicilan tetap / bulan"}
                  </th>
                  {conventional && (
                    <th scope="col">Setelah masa tetap / bulan</th>
                  )}
                  <th scope="col">Total DP + cicilan</th>
                </tr>
              </thead>
              <tbody>
                {terms.map((term) => {
                  const row = calculateKpr({ ...input, years: term });
                  return (
                    <tr
                      key={term}
                      className={years === term ? "is-selected" : ""}
                    >
                      <th scope="row">
                        <button
                          type="button"
                          aria-pressed={years === term}
                          aria-label={`Pilih tenor ${term} tahun`}
                          onClick={() => setYears(term)}
                        >
                          {term} tahun{years === term && <Check size={13} />}
                        </button>
                      </th>
                      <td>{money(row.initialMonthly)}</td>
                      {conventional && (
                        <td>
                          {row.remainingMonths
                            ? money(row.subsequentMonthly)
                            : "Tidak ada periode floating"}
                        </td>
                      )}
                      <td>{money(row.totalWithDownPayment)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="kpr-empty">
            Lengkapi angka yang valid untuk membandingkan tenor.
          </p>
        )}
        <div className="kpr-method">
          <Info size={18} />
          <div>
            <strong>
              Cara membaca simulasi {conventional ? "BTN" : "BSI"}
            </strong>
            <p>
              {conventional
                ? "Perhitungan anuitas memakai bunga efektif atas sisa pokok. Setelah masa tetap berakhir, cicilan dihitung ulang dari sisa pokok dan sisa tenor. Asumsi floating dianggap tetap sampai lunas; perubahan bunga aktual akan mengubah cicilan."
                : "Ilustrasi angsuran tetap menggunakan metode anuitas dengan margin ekuivalen efektif. Angka ini bukan perhitungan margin flat atau penetapan harga akad. Produk dengan angsuran bertahap atau akad lain dapat menghasilkan jadwal berbeda; ikuti simulasi dan akad resmi BSI."}{" "}
              Pembulatan hanya untuk tampilan. Pilihan tenor 5–25 tahun pada
              kalkulator bukan jaminan persetujuan tenor oleh bank.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
