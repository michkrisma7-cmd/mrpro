import { expect, test } from "@playwright/test";

test("login opens over the current page and can be closed with Back", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".login-link").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Masuk ke akun Anda" }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Belum punya akun? Daftar" })
    .click();
  await expect(dialog.getByLabel("Nama lengkap")).toBeVisible();
  await dialog.getByRole("button", { name: "Tampilkan kata sandi" }).click();
  await expect(dialog.locator('input[name="password"]')).toHaveAttribute(
    "type",
    "text",
  );
  const bounds = await dialog.boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.goBack();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".login-link")).toBeFocused();
});

test("direct login remains usable without a modal", async ({ page }) => {
  await page.goto("/login?lanjut=titip");
  await expect(
    page.getByRole("heading", { name: "Masuk ke akun Anda" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
