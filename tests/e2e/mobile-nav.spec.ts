import { test, expect } from "@playwright/test";

for (const width of [360, 390, 430]) {
  test(`mobile navigation follows advert edge at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/properti/rumah-tropis-modern-bintaro");
    await page.evaluate(() => document.fonts.ready);
    const header = page.locator(".site-header");
    const nav = page.getByRole("navigation", { name: "Navigasi utama" });
    const advert = page.locator('.nav-actions > a[href="/titip-properti"]');
    const gallery = page.locator(".detail-gallery");
    const before = {
      header: await header.boundingBox(),
      gallery: await gallery.boundingBox(),
      advert: await advert.boundingBox(),
    };
    await page.getByRole("button", { name: "Buka menu" }).click();
    const panel = (await nav.boundingBox())!;
    expect(panel.x).toBe(0);
    expect(panel.x + panel.width).toBeCloseTo(before.advert!.x, 0);
    expect(panel.y).toBeCloseTo(before.header!.y + before.header!.height, 0);
    expect(await header.boundingBox()).toEqual(before.header);
    expect(await gallery.boundingBox()).toEqual(before.gallery);
    expect(await advert.boundingBox()).toEqual(before.advert);
    await expect(nav.getByRole("link")).toHaveCount(8);
    expect(
      await nav.evaluate((el) =>
        [...el.querySelectorAll("a")].every(
          (a) => a.scrollWidth <= a.clientWidth,
        ),
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const outsideX = before.advert!.x + 10;
    const outsideY = before.gallery!.y + 60;
    expect(
      await page.evaluate(
        ({ x, y }) =>
          !!document.elementFromPoint(x, y)?.closest(".detail-gallery"),
        { x: outsideX, y: outsideY },
      ),
    ).toBe(true);
    await page.mouse.click(outsideX, outsideY);
    await expect(nav).toBeHidden();
    await page.getByRole("button", { name: "Buka menu" }).click();
    await page.getByRole("button", { name: "Tutup menu" }).click();
    await expect(nav).toBeHidden();
    await page.getByRole("button", { name: "Buka menu" }).click();
    await nav.getByRole("link", { name: "Properti", exact: true }).click();
    await expect(page).toHaveURL(/\/properti$/);
    await expect(nav).toBeHidden();
    await page.goto("/");
    await page.getByRole("button", { name: "Buka menu" }).click();
    expect((await nav.boundingBox())!.width).toBeCloseTo(
      (await advert.boundingBox())!.x,
      0,
    );
    await page.setViewportSize({ width: width + 15, height: 300 });
    await expect
      .poll(async () =>
        Math.abs(
          (await nav.boundingBox())!.width - (await advert.boundingBox())!.x,
        ),
      )
      .toBeLessThan(1);
    expect(await nav.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(
      true,
    );
    expect(
      (await nav.boundingBox())!.y + (await nav.boundingBox())!.height,
    ).toBeLessThanOrEqual(300);
    await nav.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(
      nav.getByRole("link", { name: "Tentang Kami", exact: true }),
    ).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(nav).toBeHidden();
  });
}

test("desktop navigation retains inline layout", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator(".main-nav")).toBeVisible();
  await expect(page.locator(".menu-toggle")).toBeHidden();
  expect(
    await page
      .locator(".main-nav")
      .evaluate((el) => getComputedStyle(el).position),
  ).toBe("static");
});
