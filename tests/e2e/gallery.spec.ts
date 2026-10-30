import { test, expect } from "@playwright/test";

for (const width of [375, 390, 412, 1440]) {
  test(`inline gallery keeps its frame and page flow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/properti/rumah-tropis-modern-bintaro");
    const gallery = page.locator(".detail-gallery");
    const frame = await gallery.boundingBox();
    expect(frame).not.toBeNull();
    expect(frame!.width / frame!.height).toBeCloseTo(4 / 3, 2);
    if (width <= 700) {
      expect(frame!.x).toBe(0);
      expect(frame!.width).toBe(width);
    } else {
      expect(frame!.width).toBeLessThan(width);
    }
    await expect(page.locator(".gallery-main img")).toHaveAttribute(
      "src",
      /house-1/,
    );
    await expect(page.locator(".gallery-count")).toHaveText("1 / 2");
    const url = page.url();
    await page.getByRole("button", { name: "Foto berikutnya" }).click();
    await expect(page.locator(".gallery-count")).toHaveText("2 / 2");
    await expect(page.locator(".gallery-main img")).toHaveAttribute(
      "src",
      /hero/,
    );
    expect(await gallery.boundingBox()).toEqual(frame);
    expect(page.url()).toBe(url);
    await page.getByRole("button", { name: "Foto berikutnya" }).click();
    await expect(page.locator(".gallery-count")).toHaveText("1 / 2");
    await gallery.dispatchEvent("touchstart", {
      touches: [{ identifier: 1, clientX: 250, clientY: 150 }],
    });
    await gallery.dispatchEvent("touchend", {
      changedTouches: [{ identifier: 1, clientX: 70, clientY: 155 }],
    });
    await expect(page.locator(".gallery-count")).toHaveText("2 / 2");
    await gallery.dispatchEvent("touchstart", {
      touches: [{ identifier: 1, clientX: 70, clientY: 150 }],
    });
    await gallery.dispatchEvent("touchend", {
      changedTouches: [{ identifier: 1, clientX: 250, clientY: 155 }],
    });
    await expect(page.locator(".gallery-count")).toHaveText("1 / 2");
    await gallery.dispatchEvent("touchstart", {
      touches: [{ identifier: 1, clientX: 150, clientY: 250 }],
    });
    await gallery.dispatchEvent("touchend", {
      changedTouches: [{ identifier: 1, clientX: 155, clientY: 70 }],
    });
    await expect(page.locator(".gallery-count")).toHaveText("1 / 2");
    expect(
      await gallery.evaluate((el) => getComputedStyle(el).touchAction),
    ).toBe("pan-y pinch-zoom");
    await gallery.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator(".gallery-count")).toHaveText("2 / 2");
    await page.locator(".gallery-main img").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(
      await page.locator(".detail-layout").evaluate((el) => {
        const gallery = document.querySelector(".detail-gallery")!;
        return (
          el.getBoundingClientRect().top >=
          gallery.getBoundingClientRect().bottom
        );
      }),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.goto("/properti/rumah-minimalis-bsd");
    await expect(page.locator(".gallery-count")).toHaveText("1 / 1");
    await expect(page.locator(".gallery-arrow")).toHaveCount(0);
    await expect(page.locator(".gallery-main img")).toHaveAttribute(
      "src",
      /house-2/,
    );
  });
}

test("photo and noninteractive card areas navigate to detail", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".property-card")
    .first()
    .locator(".property-image img")
    .click();
  await expect(page).toHaveURL(/\/properti\/rumah-tropis-modern-bintaro$/);
  await page.goto("/");
  await page
    .locator(".property-card")
    .first()
    .locator(".property-price")
    .scrollIntoViewIfNeeded();
  const price = await page
    .locator(".property-card")
    .first()
    .locator(".property-price")
    .boundingBox();
  await page.mouse.click(price!.x + 10, price!.y + 10);
  await expect(page).toHaveURL(/\/properti\/rumah-tropis-modern-bintaro$/);
});
