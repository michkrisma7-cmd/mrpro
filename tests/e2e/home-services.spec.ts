import { test, expect } from "@playwright/test";

const services = [
  ["AC", "ac", "Pemasangan AC"],
  ["Plafon", "plafon", "Pemasangan Plafon Gypsum"],
  ["Kanopi", "kanopi", "Pemasangan Kanopi Baru"],
  ["Pagar", "pagar", "Pemasangan Pagar Baru"],
  ["Kelistrikan", "kelistrikan", "Instalasi Listrik Baru"],
  ["Baja Ringan", "baja-ringan", "Pemasangan Rangka Atap Baja Ringan"],
  ["Dak / Peningkatan Rumah", "dak-peningkatan-rumah", "Pengecoran Dak Beton"],
  ["Kitchen Set", "kitchen-set", "Pembuatan Kitchen Set Baru"],
  ["Pengecatan", "pengecatan", "Pengecatan Interior"],
  ["Perbaikan Rumah", "perbaikan-rumah", "Perbaikan Atap Bocor"],
];

test("home service cards form two columns and five rows with only icons and names", async ({
  page,
}) => {
  await page.goto("/");
  const cards = page.locator(".services-section .home-service-card");
  await expect(cards).toHaveCount(10);
  await expect(cards.locator("h3")).toHaveText(services.map(([name]) => name));
  await expect(cards.locator("svg[aria-hidden=true]")).toHaveCount(10);
  await expect(cards.locator("p, .worker, .service-price")).toHaveCount(0);
  const boxes = await cards.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      const icon = element.querySelector("svg")!.getBoundingClientRect();
      const title = element.querySelector("h3")!.getBoundingClientRect();
      return {
        x: box.x,
        y: box.y,
        right: box.right,
        bottom: box.bottom,
        iconBottom: icon.bottom,
        titleTop: title.top,
      };
    }),
  );
  for (let row = 0; row < 5; row++) {
    const left = boxes[row * 2];
    const right = boxes[row * 2 + 1];
    expect(Math.abs(left.y - right.y)).toBeLessThan(1);
    expect(left.right).toBeLessThan(right.x);
    if (row > 0) expect(left.y).toBeGreaterThan(boxes[(row - 1) * 2].bottom);
  }
  for (const box of boxes) expect(box.iconBottom).toBeLessThan(box.titleTop);
});

test("each service card opens its own work details, prices and time guide", async ({
  page,
}) => {
  for (const [name, slug, firstJob] of services) {
    await page.goto("/");
    await page
      .locator(".services-section")
      .getByRole("link", { name, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/layanan/${slug}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    await expect(page).toHaveTitle(
      new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
    const first = page.locator(".home-service-job").first();
    await expect(first.locator("summary")).toHaveText(firstJob);
    await expect(first.locator("dt")).toHaveText([
      "Termasuk",
      "Tidak termasuk",
      "Yang perlu disiapkan",
      "Estimasi waktu",
      "Garansi pekerjaan",
      "Faktor yang mempengaruhi harga",
    ]);
    const second = page.locator(".home-service-job").nth(1);
    await expect(second.locator(".home-service-job-body")).toBeHidden();
    await second.locator("summary").click();
    await expect(second.locator(".home-service-job-body")).toBeVisible();
    await expect(page.locator(".home-service-prices table")).toHaveCount(2);
    await expect(page.locator(".home-service-prices")).toContainText("Rp");
    expect(
      await page
        .locator(".home-service-table")
        .evaluateAll((tables) =>
          tables.every((table) => table.scrollWidth <= table.clientWidth),
        ),
    ).toBe(true);
    await expect(
      page.getByRole("heading", { name: "Panduan estimasi waktu" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
