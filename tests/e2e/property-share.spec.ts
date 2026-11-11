import { test, expect } from "@playwright/test";
import { demoListings } from "../../lib/demo";
import { money } from "../../lib/format";

test("two listings share their own data through all six options and preserve card navigation", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await context.route(
    /https:\/\/(wa\.me|www\.facebook\.com|twitter\.com|t\.me)\//,
    (route) => route.fulfill({ body: "Share destination intercepted by test" }),
  );
  await page.goto("/");
  for (const listing of demoListings.slice(0, 2)) {
    const card = page.locator(".property-card").filter({
      has: page.getByRole("heading", { name: listing.title, exact: true }),
    });
    const trigger = card.getByRole("button", {
      name: `Bagikan ${listing.title}`,
      exact: true,
    });
    await trigger.click();
    await expect(page).toHaveURL(/\/$/);
    const modal = page.getByRole("dialog", { name: "Bagikan", exact: true });
    await expect(
      modal.getByRole("heading", { name: listing.title, exact: true }),
    ).toBeVisible();
    await expect(modal.locator(".property-share-price")).toHaveText(
      money(Number(listing.values.harga)),
    );
    await expect(modal.locator(".property-share-location")).toHaveText(
      String(listing.values.lokasi),
    );
    await expect(modal.locator("img")).toHaveAttribute(
      "src",
      new RegExp(listing.gallery[0].split("/").at(-1)!.replace(".webp", "")),
    );
    const url = `https://mrproperti.com/properti/${listing.slug}`;
    await modal.getByRole("button", { name: "Salin Tautan" }).click();
    await expect(modal.getByRole("status")).toHaveText(
      "Tautan berhasil disalin",
    );
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
    for (const [name, param] of [
      ["WhatsApp", "text"],
      ["Facebook", "u"],
      ["X / Twitter", "url"],
      ["Telegram", "url"],
    ]) {
      const link = modal.getByRole("link", { name, exact: true });
      const href = (await link.getAttribute("href"))!;
      expect(new URL(href).searchParams.get(param)).toContain(url);
      if (name === "WhatsApp") {
        expect(new URL(href).pathname).toBe("/");
        for (const value of [
          listing.title,
          money(Number(listing.values.harga)),
          String(listing.values.lokasi),
        ])
          expect(new URL(href).searchParams.get("text")).toContain(value);
      }
      const [popup] = await Promise.all([
        page.waitForEvent("popup"),
        link.click(),
      ]);
      await popup.waitForURL(href);
      expect(popup.url()).toBe(href);
      await popup.close();
    }
    const email = modal.getByRole("link", { name: "Email", exact: true });
    const mailto = new URL((await email.getAttribute("href"))!);
    expect(mailto.protocol).toBe("mailto:");
    expect(mailto.searchParams.get("subject")).toBe(listing.title);
    expect(mailto.searchParams.get("body")).toBe(
      `${money(Number(listing.values.harga))}\n${listing.values.lokasi}\n${url}`,
    );
    await email.evaluate((element) =>
      element.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          element.setAttribute("data-invoked", "true");
        },
        { once: true },
      ),
    );
    await email.click();
    await expect(email).toHaveAttribute("data-invoked", "true");
    await modal.getByRole("button", { name: "Tutup Bagikan" }).click();
    await expect(modal).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    await expect(card.locator("a button, a a")).toHaveCount(0);
  }
  await page
    .locator(".property-card")
    .nth(1)
    .getByRole("link", { name: "Lihat properti" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/properti/${demoListings[1].slug}$`),
  );
  expect(errors).toEqual([]);
});

test("copy waits for success and provides selected manual fallback when clipboard is denied or unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          new Promise<void>((resolve) => {
            Reflect.set(window, "finishCopy", resolve);
          }),
      },
    });
  });
  await page.goto("/");
  const trigger = page.locator(".property-share-button").first();
  await trigger.click();
  const modal = page.getByRole("dialog", { name: "Bagikan", exact: true });
  await modal.getByRole("button", { name: "Salin Tautan" }).click();
  await expect(modal.getByRole("status")).toHaveCount(0);
  await page.evaluate(() => Reflect.get(window, "finishCopy")());
  await expect(modal.getByRole("status")).toHaveText("Tautan berhasil disalin");
  for (const unavailable of [false, true]) {
    await page.evaluate(
      (missing) =>
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: missing
            ? undefined
            : { writeText: () => Promise.reject(new Error("denied")) },
        }),
      unavailable,
    );
    await modal.getByRole("button", { name: "Salin Tautan" }).click();
    await expect(modal.getByRole("status")).toHaveCount(0);
    await expect(modal.getByRole("alert")).toContainText("secara manual");
    const input = modal.getByLabel("Tautan listing");
    await expect(input).toHaveValue(
      `https://mrproperti.com/properti/${demoListings[0].slug}`,
    );
    await expect(input).toBeFocused();
    expect(
      await input.evaluate(
        (element: HTMLInputElement) =>
          element.selectionEnd! - element.selectionStart!,
      ),
    ).toBe((await input.inputValue()).length);
  }
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("modal traps keyboard focus, sits above chat, closes on backdrop, and restores scroll", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Buka Chat", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tutup Chat", exact: true }),
  ).toBeVisible();
  const trigger = page.locator(".property-share-button").first();
  // The expanded mobile chat covers the card; keyboard activation remains available.
  await trigger.focus();
  await page.keyboard.press("Enter");
  const scroll = await page.evaluate(() => window.scrollY);
  const modal = page.getByRole("dialog", { name: "Bagikan", exact: true });
  const close = modal.getByRole("button", { name: "Tutup Bagikan" });
  await expect(close).toBeFocused();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await expect(modal).toHaveJSProperty("open", true);
  expect(await modal.evaluate((element) => element.matches(":modal"))).toBe(
    true,
  );
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    expect(
      await modal.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await close.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(
    modal.getByRole("link", { name: "Email", exact: true }),
  ).toBeFocused();
  const box = (await modal.boundingBox())!;
  await page.mouse.click(box.x + 4, box.y + 4);
  await expect(modal).toBeVisible();
  await page.mouse.click(3, 3);
  await expect(modal).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await expect(
    page.getByRole("button", { name: "Tutup Chat", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tutup Chat", exact: true }).click();
  await page.getByRole("button", { name: "Buka Chat", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tutup Chat", exact: true }),
  ).toBeVisible();
});

test("all public card contexts show sharing with a two-column responsive modal", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "mr-favorites",
      JSON.stringify(["contoh-1", "contoh-2"]),
    ),
  );
  for (const path of [
    "/",
    "/beranda",
    "/?jenis=Rumah",
    "/properti",
    "/properti?q=Bintaro",
    "/properti?favorit=1",
    "/properti?transaksi=Disewa",
  ]) {
    await page.goto(path);
    const cards = page.locator(".property-card");
    await expect(cards.first()).toBeVisible();
    await expect(page.locator(".property-share-button")).toHaveCount(
      await cards.count(),
    );
    await cards
      .first()
      .getByRole("button", { name: /^Bagikan / })
      .click();
    const modal = page.getByRole("dialog", { name: "Bagikan", exact: true });
    await expect(modal).toBeVisible();
    await expect(modal.locator(".property-share-options > *")).toHaveText([
      "Salin Tautan",
      "WhatsApp",
      "Facebook",
      "X / Twitter",
      "Telegram",
      "Email",
    ]);
    if (path.endsWith("Disewa"))
      await expect(modal.locator(".property-share-price")).toContainText(
        "/ tahun",
      );
    await page.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);
  }
  await page.goto("/");
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    const card = page.locator(".property-card").first();
    const trigger = card.locator(".property-share-button");
    const price = (await card.locator(".property-price").boundingBox())!;
    const button = (await trigger.boundingBox())!;
    expect(price.x + price.width).toBeLessThanOrEqual(button.x);
    expect(
      await card.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await trigger.click();
    const modal = page.getByRole("dialog", { name: "Bagikan", exact: true });
    await expect(modal).toBeVisible();
    const bounds = (await modal.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(720);
    const options = await modal
      .locator(".property-share-options > *")
      .evaluateAll((elements) =>
        elements.map((element) => ({
          x: element.getBoundingClientRect().x,
          y: element.getBoundingClientRect().y,
        })),
      );
    expect(options[0].y).toBe(options[1].y);
    expect(options[2].y).toBe(options[3].y);
    expect(options[4].y).toBe(options[5].y);
    expect(options[0].x).toBe(options[2].x);
    expect(options[1].x).toBeGreaterThan(options[0].x);
    expect(
      await modal.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    if (width === 375 || width === 1280)
      await page.screenshot({
        path: testInfo.outputPath(`share-${width}.png`),
      });
    await page.keyboard.press("Escape");
  }
});

test("new cards handle empty optional data, broken photos, long content and existing owner contacts", async ({
  page,
  context,
}) => {
  const longTitle = "Rumah & taman #1 + keluarga 🏡 ".repeat(14);
  const empty = {
    ...demoListings[0],
    id: "new-empty",
    slug: "new-empty",
    title: "Listing baru tanpa data opsional",
    gallery: [],
    values: {},
    ownerName: undefined,
    whatsapp: "",
  };
  const long = {
    ...demoListings[1],
    id: "new-long",
    title: longTitle,
    gallery: ["/images/missing-share-photo.webp"],
    values: {
      ...demoListings[1].values,
      harga: Number.MAX_SAFE_INTEGER,
      lokasi: "Jl. Panjang & lokasi lengkap, Bekasi. ".repeat(15),
    },
    ownerName: "Pemilik listing",
    whatsapp: "081234567890",
  };
  await page.addInitScript(() =>
    localStorage.setItem(
      "mr-favorites",
      JSON.stringify(["new-empty", "new-long"]),
    ),
  );
  await page.route("**/api/favorites?**", (route) =>
    route.fulfill({ json: [empty, long] }),
  );
  await context.route("https://wa.me/6281234567890?**", (route) =>
    route.fulfill({ body: "Owner contact intercepted by test" }),
  );
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/properti?favorit=1");
  const cards = page.locator(".property-card");
  await expect(cards).toHaveCount(2);
  await cards
    .first()
    .getByRole("button", { name: /^Bagikan / })
    .click();
  const modal = page.getByRole("dialog", { name: "Bagikan", exact: true });
  await expect(
    modal.getByRole("heading", { name: empty.title, exact: true }),
  ).toBeVisible();
  await expect(
    modal.locator(".property-share-price, .property-share-location"),
  ).toHaveCount(0);
  await expect(modal).not.toContainText(/undefined|null/);
  await expect(modal.locator("img")).toHaveAttribute("src", /hero/);
  await expect
    .poll(() =>
      modal
        .locator("img")
        .evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
    )
    .toBe(true);
  await expect(
    modal.getByRole("link", { name: "Facebook", exact: true }),
  ).toHaveAttribute("href", /mrproperti.com%2Fproperti%2Fnew-empty/);
  await page.keyboard.press("Escape");
  const price = (await cards.nth(1).locator(".property-price").boundingBox())!;
  const share = (await cards
    .nth(1)
    .locator(".property-share-button")
    .boundingBox())!;
  expect(price.x + price.width).toBeLessThanOrEqual(share.x);
  await cards
    .nth(1)
    .getByRole("button", { name: /^Bagikan / })
    .click();
  await expect(
    modal.getByRole("heading", { name: longTitle.trim(), exact: true }),
  ).toBeVisible();
  await expect(modal).not.toContainText(empty.title);
  await expect(modal.locator("img")).toHaveAttribute("src", /hero/);
  const box = (await modal.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(568);
  expect(
    await modal.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  const email = modal.getByRole("link", { name: "Email", exact: true });
  await email.scrollIntoViewIfNeeded();
  await expect(email).toBeInViewport();
  await email.focus();
  await page.keyboard.press("Tab");
  await expect(
    modal.getByRole("button", { name: "Tutup Bagikan" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  const phone = cards
    .nth(1)
    .getByRole("link", { name: "Telepon Pemilik listing", exact: true });
  await expect(phone).toHaveAttribute("href", "tel:+6281234567890");
  await phone.evaluate((element) =>
    element.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        element.setAttribute("data-invoked", "true");
      },
      { once: true },
    ),
  );
  await phone.click();
  await expect(phone).toHaveAttribute("data-invoked", "true");
  const whatsapp = cards
    .nth(1)
    .getByRole("link", { name: "WhatsApp Pemilik listing", exact: true });
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    whatsapp.click(),
  ]);
  await popup.waitForURL(/https:\/\/wa.me\/6281234567890/);
  expect(new URL(popup.url()).searchParams.get("text")).toContain(longTitle);
  await popup.close();
  await expect(page).toHaveURL(/\/properti\?favorit=1$/);
});
