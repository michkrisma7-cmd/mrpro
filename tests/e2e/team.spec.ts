import { test, expect } from "@playwright/test";

test("team page is reachable and has an honest empty state without a database", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  if (isMobile) await page.getByRole("button", { name: "Buka menu" }).click();
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Tim Kami", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tim-kami$/);
  await expect(
    page.getByRole("heading", { name: "Tim Kami", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Profil tim segera hadir." }),
  ).toBeVisible();
  await expect(page.locator(".team-card")).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/tim-kami$/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("team admin form is read only without authentication and database configuration", async ({
  page,
}) => {
  await page.goto("/admin?tab=tim&edit=baru");
  await expect(page.getByLabel("Nama", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Bidang keahlian")).toBeDisabled();
  await expect(page.getByLabel("Pengalaman kerja")).toBeDisabled();
  await expect(page.getByLabel("Foto anggota tim")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Simpan Anggota Tim" }),
  ).toBeDisabled();
});
