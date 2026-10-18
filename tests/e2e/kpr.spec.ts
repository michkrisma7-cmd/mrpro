import { test, expect } from "@playwright/test";

test("home and footer open the KPR calculator with both bank choices", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.locator(".hero-actions").getByRole("link", { name: "Kalkulator KPR" }),
  ).toHaveAttribute("href", "/kalkulator-kpr");
  await expect(
    page.locator("footer").getByRole("link", { name: "Kalkulator KPR" }),
  ).toHaveAttribute("href", "/kalkulator-kpr");
  await page
    .locator(".hero-actions")
    .getByRole("link", { name: "Kalkulator KPR" })
    .click();
  await expect(page).toHaveTitle(/Kalkulator KPR BTN & BSI/);
  await expect(
    page.getByRole("radio", { name: /KPR Konvensional/ }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: /KPR Syariah/ }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("heading", { name: "Syarat pengajuan KPR" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Bank BTN", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Bank BSI", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("BTN and BSI recompute amounts, tenors and validation without mixing their rates", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/kalkulator-kpr");
  await page
    .getByLabel("Harga properti (Rp)", { exact: false })
    .fill("1000000000");
  await page.getByLabel("Uang muka (%)", { exact: false }).fill("25");
  await expect(page.locator(".kpr-breakdown")).toContainText(/Rp\s*250\.000\.000/);
  await expect(page.locator(".kpr-breakdown")).toContainText(/Rp\s*750\.000\.000/);
  await expect(page.locator("tbody tr")).toHaveCount(21);
  await page.getByLabel("Tenor (tahun)", { exact: false }).selectOption("25");
  await expect(page.locator(".kpr-breakdown")).toContainText(
    "25 tahun · 300 bulan",
  );
  await expect(page.locator(".kpr-floating")).toBeVisible();
  await page.getByRole("radio", { name: /KPR Syariah/ }).check();
  await expect(
    page.getByLabel("Margin ekuivalen efektif", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".kpr-floating")).toHaveCount(0);
  await expect(
    page.getByLabel("Asumsi floating", { exact: false }),
  ).toHaveCount(0);
  await page.getByLabel("Margin ekuivalen efektif", { exact: false }).fill("0");
  await page
    .getByRole("button", { name: "Pilih tenor 5 tahun", exact: true })
    .click();
  await expect(page.locator(".kpr-monthly")).toContainText(/Rp\s*12\.500\.000/);
  await page.getByLabel("Uang muka (%)", { exact: false }).fill("100");
  await expect(page.locator(".kpr-summary [role=alert]")).toContainText(
    "kurang dari 100%",
  );
  await expect(page.locator(".kpr-monthly")).toHaveCount(0);
  await page.getByLabel("Uang muka (%)", { exact: false }).fill("25");
  await page.getByRole("radio", { name: /KPR Konvensional/ }).check();
  await expect(
    page.getByLabel("Bunga tetap awal", { exact: false }),
  ).toHaveValue("8");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
