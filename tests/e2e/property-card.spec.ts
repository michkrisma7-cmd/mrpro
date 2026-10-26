import { test, expect } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PropertyCard } from "../../components/property-card";
import { demoListings, defaultFields } from "../../lib/demo";

test("shared cards keep detail navigation, main photo and persistent favorites", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.locator(".property-card").first();
  await expect(card.locator(".property-image img")).toHaveAttribute(
    "src",
    /house-1/,
  );
  await expect(card.locator(".property-contact a")).toHaveCount(0);
  await expect(card.locator("a a, a button")).toHaveCount(0);
  const favorite = card.getByRole("button", { name: "Simpan properti" });
  await favorite.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    card.getByRole("button", { name: "Hapus dari tersimpan" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    page
      .locator(".property-card")
      .first()
      .getByRole("button", { name: "Hapus dari tersimpan" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .locator(".property-card")
    .first()
    .getByRole("link", { name: "Lihat properti" })
    .click();
  await expect(page).toHaveURL(/\/properti\/rumah-tropis-modern-bintaro$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    demoListings[0].title,
  );
});

test("card fits long names, titles and valid or empty contacts on narrow screens and desktop", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const title =
    "Rumah keluarga dengan judul sangat panjang di lingkungan asri dan nyaman dekat fasilitas umum";
  const ownerName =
    "Pemilik Dengan Nama Sangat Panjang Sekali Untuk Pemeriksaan";
  const markup = ["081234567890", "", "invalid"]
    .map((whatsapp) =>
      renderToStaticMarkup(
        createElement(PropertyCard, {
          property: { ...demoListings[0], title, ownerName, whatsapp },
          fields: defaultFields,
        }),
      ),
    )
    .join("");
  await page
    .locator(".property-grid")
    .first()
    .evaluate((grid, html) => {
      grid.innerHTML = html;
    }, markup);
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const cards = page
      .locator(".property-grid")
      .first()
      .locator(".property-card");
    await expect(cards).toHaveCount(3);
    const card = cards.first();
    await expect(card.locator(".property-contact-phone")).toHaveAttribute(
      "href",
      "tel:+6281234567890",
    );
    const wa = new URL(
      (await card.locator(".property-contact-whatsapp").getAttribute("href"))!,
    );
    expect(wa.pathname).toBe("/6281234567890");
    expect(wa.searchParams.get("text")).toContain(title);
    await expect(
      card.locator("a a, a button, .property-contact img"),
    ).toHaveCount(0);
    await expect(cards.nth(1).locator(".property-contact a")).toHaveCount(0);
    await expect(cards.nth(2).locator(".property-contact a")).toHaveCount(0);
    const fits = await card.evaluate((element) => {
      const owner = element.querySelector(".property-contact-owner > span")!;
      const contact = element.querySelector(".property-contact")!;
      const phone = element.querySelector(".property-contact-phone")!;
      const wa = element.querySelector(".property-contact-whatsapp")!;
      const specs = Array.from(
        element.querySelectorAll(".property-specs > span"),
      );
      const style = getComputedStyle(element);
      return {
        overflow: element.scrollWidth > element.clientWidth,
        contactOverflow: contact.scrollWidth > contact.clientWidth,
        sameRow:
          Math.abs(
            phone.getBoundingClientRect().y - wa.getBoundingClientRect().y,
          ) < 1,
        specsOneRow:
          Math.max(...specs.map((s) => s.getBoundingClientRect().y)) -
            Math.min(...specs.map((s) => s.getBoundingClientRect().y)) <
          1,
        ellipsis: getComputedStyle(owner).textOverflow,
        border: [style.borderLeftWidth, style.borderRightWidth],
        objectFit: getComputedStyle(element.querySelector("img")!).objectFit,
      };
    });
    await card.evaluate((element) =>
      element.scrollIntoView({ block: "center" }),
    );
    await card.locator(".property-contact-whatsapp").click({ trial: true });
    if (width === 375 || width === 1280) {
      await card.screenshot({
        path: testInfo.outputPath(`card-${width}.png`),
      });
    }
    expect(fits).toEqual({
      overflow: false,
      contactOverflow: false,
      sameRow: true,
      specsOneRow: true,
      ellipsis: "ellipsis",
      border: ["1px", "1px"],
      objectFit: "cover",
    });
  }
});
