import { test, expect } from "@playwright/test";
test("landing separates properties and services, with responsive navigation", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Ruang baru",
  );
  await expect(page.locator("#properti .property-card")).toHaveCount(3);
  await expect(page.locator(".services-section .service-card")).toHaveCount(4);
  await expect(page.locator("#properti .service-card")).toHaveCount(0);
  await expect(page.locator(".services-section .property-card")).toHaveCount(0);
  await expect(page.locator(".hero-photo img")).toBeVisible();
  await expect(page.locator(".property-hero .eyebrow")).toHaveText(
    "PARTNER UNTUK SETIAP RENCANA",
  );
  await expect(page.locator(".property-hero")).not.toContainText(
    "Temukan tempat untuk pulang",
  );
  const sale = page.getByRole("button", { name: "Dijual", exact: true });
  const rent = page.getByRole("button", { name: "Sewa", exact: true });
  await expect(sale).toHaveAttribute("aria-pressed", "true");
  const saleBox = await sale.boundingBox();
  const rentBox = await rent.boundingBox();
  expect(Math.abs(saleBox!.y - rentBox!.y)).toBeLessThan(1);
  const heroBox = await page.locator(".property-hero").boundingBox();
  const headingBox = await page.locator("#hero-title").boundingBox();
  expect(headingBox!.y).toBeGreaterThan(heroBox!.y);
  expect(saleBox!.y + saleBox!.height).toBeLessThan(
    heroBox!.y + heroBox!.height,
  );
  if (isMobile) {
    await expect(
      page.getByPlaceholder("Masukan lokasi atau nama proyek"),
    ).toBeVisible();
    await expect(page.locator(".hero-search-desktop")).toBeHidden();
    await expect(page.locator(".home-trust-strip")).toBeHidden();
    await expect(page.locator("#properti > .section-heading")).toBeHidden();
    await expect(page.locator("#properti > .catalog-tabs")).toBeHidden();
    const search = await page.locator(".hero-search-mobile").boundingBox();
    const actions = await page.locator(".property-hero-actions").boundingBox();
    expect(search!.y + search!.height).toBeLessThan(actions!.y);
  } else {
    await expect(page.getByPlaceholder("Mau tinggal di mana?")).toBeVisible();
    await expect(page.locator(".hero-search-mobile")).toBeHidden();
    await expect(page.locator(".home-trust-strip")).toBeVisible();
    await expect(page.locator("#properti > .section-heading")).toBeVisible();
    await expect(page.locator(".hero-search-desktop select")).toHaveCount(2);
  }
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(fits).toBe(true);
});
test("hero preserves search filters and uses the selected sale or rental transaction", async ({
  page,
}) => {
  await page.goto("/");
  const query = page.locator('.property-hero input[name="q"]:visible');
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
