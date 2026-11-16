import { test, expect } from "@playwright/test";

test("listing-first home keeps search, categories, KPR and location navigation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".hero-section")).toHaveCount(0);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator(".property-image")
        .first()
        .evaluate((el) => el.getBoundingClientRect().top),
    ).toBeLessThan(450);
    if (width === 390) {
      await page.getByRole("button", { name: "Buka menu" }).click();
      await page.locator(".location-nav summary").click();
      const links = page.locator(".location-submenu a");
      await expect(links).toHaveText([
        "Bekasi",
        "Cikarang",
        "Karawang",
        "Cikampek",
      ]);
      for (const name of ["Bekasi", "Cikarang", "Karawang", "Cikampek"]) {
        await expect(links.filter({ hasText: name })).toHaveAttribute(
          "href",
          `/wilayah/${name.toLowerCase()}`,
        );
      }
      await page.locator(".location-nav summary").click();
      await expect(links.first()).toBeHidden();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("navigation", { name: "Navigasi utama" }),
      ).toBeHidden();
    }
  }
  await page.locator(".quick-property-search input").fill("rumah");
  await page.locator(".quick-property-search button").click();
  await expect(page).toHaveURL(/\/properti\?q=rumah$/);
  await page.goto("/");
  await page
    .locator(".catalog-tabs")
    .getByRole("link", { name: "Tanah", exact: true })
    .click();
  await expect(page).toHaveURL(/jenis=Tanah/);
  await expect(page.locator(".catalog-tabs a.active")).toHaveText("Tanah");
  await expect(
    page.getByRole("link", { name: "Bantuan Admin", exact: true }),
  ).toHaveAttribute("href", /^(https:\/\/wa.me\/|\/tentang-kami)/);
  await page
    .locator(".home-utility-actions")
    .getByRole("link", { name: "Kalkulator KPR" })
    .click();
  await expect(page).toHaveURL(/\/kalkulator-kpr$/);
  await expect(page.locator(".kpr-breakdown")).toContainText("Pokok pinjaman");
});
