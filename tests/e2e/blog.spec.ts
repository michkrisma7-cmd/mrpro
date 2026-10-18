import { test, expect } from "@playwright/test";
test("blog is reachable from home and has an empty state without a database", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#blog")).toContainText(
    "Inspirasi & panduan rumah.",
  );
  await page
    .locator("#blog")
    .getByRole("link", { name: "Semua Artikel" })
    .click();
  await expect(page).toHaveURL(/\/blog$/);
  await expect(
    page.getByRole("heading", { name: "Inspirasi & panduan rumah." }),
  ).toBeVisible();
  await expect(page.getByText("Artikel terbaru segera hadir.")).toBeVisible();
});
test("blog preview cannot submit edits and missing articles reveal no content", async ({
  page,
}) => {
  await page.goto("/admin?tab=blog&edit=baru");
  await expect(
    page.getByRole("button", { name: "Simpan Artikel" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Judul", { exact: true })).toBeDisabled();
  await page.goto("/blog/artikel-rahasia");
  await expect(
    page.getByRole("heading", { name: "Sepertinya Anda salah alamat." }),
  ).toBeVisible();
});
