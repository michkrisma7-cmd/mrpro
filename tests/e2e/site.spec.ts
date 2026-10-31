import { test, expect } from "@playwright/test";
import { demoListings } from "../../lib/demo";
test("landing starts with compact search, one listing H1 and unchanged cards", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Properti terbaru",
  );
  await expect(
    page.locator(".property-hero, .property-hero-photo, #hero-title"),
  ).toHaveCount(0);
  await expect(
    page.getByText("PARTNER UNTUK SETIAP RENCANA", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("#properti .property-card")).toHaveCount(
    demoListings.slice(0, 12).length,
  );
  await expect(
    page.locator(".services-section .home-service-card"),
  ).toHaveCount(10);
  await expect(page.locator("#properti .service-card")).toHaveCount(0);
  await expect(page.locator(".services-section .property-card")).toHaveCount(0);
  const sale = page.getByRole("button", { name: "Dijual", exact: true });
  const rent = page.getByRole("button", { name: "Sewa", exact: true });
  await expect(sale).toHaveAttribute("aria-pressed", "true");
  const saleBox = (await sale.boundingBox())!,
    rentBox = (await rent.boundingBox())!;
  expect(saleBox.y).toBe(rentBox.y);
  const header = (await page.locator(".site-header").boundingBox())!;
  const panel = (await page.locator(".property-hero-search").boundingBox())!;
  expect(panel.y - (header.y + header.height)).toBeLessThanOrEqual(24);
  await expect(page.locator(".property-hero-search")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  const actions = page.locator(".home-search-actions");
  const links = actions.getByRole("link");
  await expect(links).toHaveText(["Kalkulator KPR", "Kenali Kami"]);
  const first = (await links.nth(0).boundingBox())!,
    second = (await links.nth(1).boundingBox())!;
  expect(first.y).toBe(second.y);
  expect(first.y).toBeGreaterThanOrEqual(panel.y + panel.height);
  const listing = (await page.locator("#properti").boundingBox())!;
  expect(listing.y).toBeGreaterThanOrEqual(first.y + first.height);
  expect(listing.y - (first.y + first.height)).toBeLessThan(2);
  if (isMobile) {
    await expect(
      page.getByPlaceholder("Lokasi atau nama properti"),
    ).toBeVisible();
    await expect(page.locator(".hero-search-desktop")).toBeHidden();
    await expect(page.locator(".home-trust-strip")).toBeHidden();
    await expect(page.locator("#properti > .section-heading")).toBeHidden();
    const categories = page.locator("#properti > .catalog-tabs");
    await expect(categories).toHaveCSS("flex-wrap", "nowrap");
    await expect(categories.locator("a")).toHaveText([
      "Semua Properti",
      "Rumah",
      "Apartemen",
      "Tanah",
      "Ruko",
    ]);
    const positions = await categories
      .locator("a")
      .evaluateAll((links) =>
        links.map((link) => link.getBoundingClientRect().y),
      );
    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(1);
    expect(
      (await page.locator("#properti .property-card").first().boundingBox())!.y,
    ).toBeLessThan(500);
  } else {
    await expect(page.getByPlaceholder("Mau tinggal di mana?")).toBeVisible();
    await expect(page.locator(".hero-search-mobile")).toBeHidden();
    await expect(page.locator(".home-trust-strip")).toBeVisible();
    await expect(page.locator(".hero-search-desktop select")).toHaveCount(2);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (isMobile) {
    await page
      .locator("#properti > .catalog-tabs")
      .getByRole("link", { name: "Ruko", exact: true })
      .click();
    await expect(page).toHaveURL(/jenis=Ruko/);
  }
});

test("compact search preserves search filters and uses the selected sale or rental transaction", async ({
  page,
}) => {
  await page.goto("/");
  const query = page.locator('.home-search input[name="q"]:visible');
  await query.fill("Bintaro");
  await page.getByRole("button", { name: "Sewa", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sewa", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(query).toHaveValue("Bintaro");
  await page
    .getByRole("button", { name: "Cari Properti", exact: true })
    .click();
  await expect(page).toHaveURL(/transaksi=Disewa/);
  expect(new URL(page.url()).searchParams.get("q")).toBe("Bintaro");
  await expect(page.locator(".property-card")).toHaveCount(0);
  await page.goto("/");
  await page.getByRole("button", { name: "Sewa", exact: true }).click();
  await page.getByRole("button", { name: "Dijual", exact: true }).click();
  await query.fill("Bintaro");
  await page
    .getByRole("button", { name: "Cari Properti", exact: true })
    .click();
  await expect(page).toHaveURL(/transaksi=Dijual/);
  await expect(page.locator(".property-card")).toHaveCount(1);
});
test("search filters listings and displays useful empty state", async ({
  page,
}) => {
  await page.goto("/properti");
  await page.getByPlaceholder("Mau tinggal di mana?").fill("Bintaro");
  await page.getByRole("button", { name: "Cari Properti" }).click();
  await expect(page.locator(".property-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Rumah tropis modern di Bintaro" }),
  ).toBeVisible();
  await page.getByPlaceholder("Mau tinggal di mana?").fill("TidakAdaKotaIni");
  await page.getByRole("button", { name: "Cari Properti" }).click();
  await expect(page.getByText("Belum menemukan yang cocok?")).toBeVisible();
});
test("favorites persist on the current device", async ({ page }) => {
  await page.goto("/properti");
  await page.getByRole("button", { name: "Simpan properti" }).first().click();
  await page.goto("/properti?favorit=1");
  await expect(page.locator(".property-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Hapus dari tersimpan" }).click();
  await expect(page.getByText("Belum ada properti tersimpan")).toBeVisible();
});
test("property details have metadata and gallery navigation", async ({
  page,
}) => {
  await page.goto("/properti/rumah-tropis-modern-bintaro");
  await expect(page).toHaveTitle(/Rumah tropis modern di Bintaro/);
  await expect(
    page.getByRole("heading", { name: "Spesifikasi properti" }),
  ).toBeVisible();
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(
    1,
  );
  await page.getByRole("button", { name: "Lihat 2 foto" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Foto berikutnya" }).click();
  await expect(page.locator(".lightbox-position")).toHaveText("2 / 2");
  await page.getByRole("button", { name: "Tutup galeri" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("admin preview is read-only and field editor lists all visibility options", async ({
  page,
}) => {
  await page.goto("/admin?tab=field");
  await expect(
    page.getByText("Pratinjau dashboard — hanya baca."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tambah Field" }).click();
  await expect(page.getByText("Tampil di form", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Tampil di kartu", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Tampil di detail", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Simpan Field" }),
  ).toBeDisabled();
});
test("login and submission do not pretend to work without configured credentials", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Masuk ke Akun" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Daftar Akun" }).click();
  await expect(page.getByLabel("Nama lengkap")).toBeVisible();
  await page.goto("/titip-properti");
  await expect(
    page.getByText("Masuk untuk menitipkan properti."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tayangkan Properti" }),
  ).toBeDisabled();
});
test("unavailable and unauthorized APIs fail safely", async ({ request }) => {
  const auth = await request.get("/api/auth/session");
  expect(auth.status()).toBe(503);
  const upload = await request.post("/api/upload", {
    headers: { origin: "http://127.0.0.1:3100" },
  });
  expect(upload.status()).toBe(401);
  const crossOrigin = await request.post("/api/upload", {
    headers: { origin: "https://evil.example" },
  });
  expect(crossOrigin.status()).toBe(403);
  const absent = await request.get("/properti/properti-tidak-ada");
  expect(absent.status()).toBe(404);
});
