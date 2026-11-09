import { test, expect } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Gallery } from "../../components/gallery";

const currentPhoto = '.gallery-main img[aria-hidden="false"]';

test("uploaded gallery renders the prepared web variant without an optimizer or master request", () => {
  const markup = renderToStaticMarkup(
    createElement(Gallery, {
      images: ["/api/media/first-photo", "/api/media/next-photo"],
      title: "Uploaded listing",
    }),
  );
  expect(markup).toContain('src="/api/media/first-photo/display.webp"');
  expect(markup).not.toContain("/_next/image");
  expect(markup).not.toContain("srcSet=");
  expect(markup).not.toContain('src="/api/media/first-photo"');
});

test("next photo starts before navigation and keeps the current photo until ready", async ({
  page,
}) => {
  let releasePhoto!: () => void;
  const waitForRelease = new Promise<void>((resolve) => {
    releasePhoto = resolve;
  });
  const photoRequests: string[] = [];
  await page.route("**/_next/image?**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("url") === "/images/hero.webp") {
      photoRequests.push(url.href);
      await waitForRelease;
    }
    await route.continue();
  });
  await page.goto("/properti/rumah-tropis-modern-bintaro", {
    waitUntil: "domcontentloaded",
  });
  await expect.poll(() => photoRequests.length).toBe(1);
  const nextPhoto = page.locator('.gallery-main img[aria-hidden="true"]');
  await expect(nextPhoto).toHaveAttribute("loading", "eager");
  await expect(nextPhoto).toHaveAttribute("fetchpriority", "low");
  const prefetchedUrl = photoRequests[0];
  await page.getByRole("button", { name: "Foto berikutnya" }).click();
  await expect(page.locator(".gallery-main")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(page.locator(currentPhoto)).toHaveAttribute("src", /house-1/);
  await expect(page.locator(".gallery-count")).toHaveText("1 / 2");
  releasePhoto();
  await expect(page.locator(".gallery-count")).toHaveText("2 / 2");
  await expect(page.locator(currentPhoto)).toHaveAttribute("src", /hero/);
  await expect(page.locator(".gallery-main")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  expect(
    await page.locator(currentPhoto).evaluate((image) => {
      const img = image as HTMLImageElement;
      return {
        src: img.currentSrc,
        ready: img.complete && img.naturalWidth > 0,
      };
    }),
  ).toEqual({ src: prefetchedUrl, ready: true });
  expect(photoRequests).toHaveLength(1);
});

test("a late photo response does not override a newer navigation", async ({
  page,
}) => {
  let releasePhoto!: () => void;
  const waitForRelease = new Promise<void>((resolve) => {
    releasePhoto = resolve;
  });
  let nextRequested = false;
  await page.route("**/_next/image?**", async (route) => {
    if (
      new URL(route.request().url()).searchParams.get("url") ===
      "/images/hero.webp"
    ) {
      nextRequested = true;
      await waitForRelease;
    }
    await route.continue();
  });
  await page.goto("/properti/rumah-tropis-modern-bintaro", {
    waitUntil: "domcontentloaded",
  });
  await expect.poll(() => nextRequested).toBe(true);
  const next = page.getByRole("button", { name: "Foto berikutnya" });
  await next.click();
  await next.click();
  releasePhoto();
  await page
    .locator('.gallery-main img[aria-hidden="true"]')
    .evaluate(async (image) => {
      await (image as HTMLImageElement).decode();
    });
  await expect(page.locator(currentPhoto)).toHaveAttribute("src", /house-1/);
  await expect(page.locator(".gallery-count")).toHaveText("1 / 2");
  await next.click();
  await expect(page.locator(".gallery-count")).toHaveText("2 / 2");
});

test("data saver skips speculative photos and still allows navigation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true },
    });
  });
  let nextRequested = false;
  page.on("request", (request) => {
    if (new URL(request.url()).searchParams.get("url") === "/images/hero.webp")
      nextRequested = true;
  });
  await page.goto("/properti/rumah-tropis-modern-bintaro");
  await page.locator(currentPhoto).evaluate(async (image) => {
    await (image as HTMLImageElement).decode();
  });
  await expect(page.locator(".gallery-main img")).toHaveCount(1);
  expect(nextRequested).toBe(false);
  await page.getByRole("button", { name: "Foto berikutnya" }).click();
  await expect(page.locator(".gallery-count")).toHaveText("2 / 2");
  expect(nextRequested).toBe(true);
});

test("failed next photo keeps the previous photo and can be retried", async ({
  page,
}) => {
  let attempts = 0;
  await page.route("**/_next/image?**", async (route) => {
    if (
      new URL(route.request().url()).searchParams.get("url") ===
      "/images/hero.webp"
    ) {
      attempts += 1;
      if (attempts <= 2) {
        await route.abort("failed");
        return;
      }
    }
    await route.continue();
  });
  await page.goto("/properti/rumah-tropis-modern-bintaro");
  await expect.poll(() => attempts).toBe(1);
  await expect(page.locator(".gallery-main img")).toHaveCount(1);
  const next = page.getByRole("button", { name: "Foto berikutnya" });
  await next.click();
  await expect(
    page.getByText("Foto tidak dapat dimuat. Silakan coba foto lain."),
  ).toHaveCount(1);
  await expect(page.locator(currentPhoto)).toHaveAttribute("src", /house-1/);
  await expect(page.locator(".gallery-count")).toHaveText("1 / 2");
  await next.click();
  await next.click();
  await expect(page.locator(".gallery-count")).toHaveText("2 / 2");
  expect(attempts).toBe(3);
});

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
    await expect(
      page.locator('.gallery-main img[aria-hidden="false"]'),
    ).toHaveAttribute("src", /house-1/);
    await expect(page.locator(".gallery-count")).toHaveText("1 / 2");
    const url = page.url();
    await page.getByRole("button", { name: "Foto berikutnya" }).click();
    await expect(page.locator(".gallery-count")).toHaveText("2 / 2");
    await expect(
      page.locator('.gallery-main img[aria-hidden="false"]'),
    ).toHaveAttribute("src", /hero/);
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
    await page.locator('.gallery-main img[aria-hidden="false"]').click();
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
    await expect(
      page.locator('.gallery-main img[aria-hidden="false"]'),
    ).toHaveAttribute("src", /house-2/);
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
