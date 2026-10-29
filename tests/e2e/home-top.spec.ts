import { test, expect } from "@playwright/test";

test("homepage top fits phone, tablet and desktop; quick links and filters work", async ({
  page,
}) => {
  await page.goto("/");
  for (const width of [320, 390, 560, 561, 768, 820, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => scrollTo(0, 0));
    const actions = page.locator(".home-search-actions a");
    const a = (await actions.nth(0).boundingBox())!,
      b = (await actions.nth(1).boundingBox())!;
    expect(a.y).toBe(b.y);
    expect(a.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `work/home-top-${width}.png` });
  }
  await page
    .locator(".home-search-actions")
    .getByRole("link", { name: "Kalkulator KPR" })
    .click();
  await expect(page).toHaveURL(/\/kalkulator-kpr$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("KPR");
  await page.goto("/");
  const about = page
    .locator(".home-search-actions")
    .getByRole("link", { name: "Kenali Kami" });
  await expect(about).toHaveAttribute("href", "/#tentang");
  await about.click();
  await expect(page).toHaveURL(/#tentang$/);
  await expect(page.locator("#tentang")).toBeInViewport();
  await page.goto("/");
  await page.locator('.home-search input[name="q"]:visible').fill("Bintaro");
  await page.locator('.home-search select[name="jenis"]').selectOption("Rumah");
  await page
    .locator('.home-search select[name="harga"]')
    .selectOption("2000000000");
  await page.getByRole("button", { name: "Sewa", exact: true }).click();
  await expect(page.locator('.home-search select[name="jenis"]')).toHaveValue(
    "Rumah",
  );
  await expect(page.locator('.home-search select[name="harga"]')).toHaveValue(
    "2000000000",
  );
  await page
    .getByRole("button", { name: "Cari Properti", exact: true })
    .click();
  expect(Object.fromEntries(new URL(page.url()).searchParams)).toMatchObject({
    q: "Bintaro",
    jenis: "Rumah",
    harga: "2000000000",
    transaksi: "Disewa",
  });
  await expect(page.locator(".property-card")).toHaveCount(0);
});
