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

test("home service cards preserve links and show summaries only on desktop", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  const cards = page.locator(".services-section .home-service-card");
  await expect(cards).toHaveCount(10);
  await expect(cards.locator("h3")).toHaveText(services.map(([name]) => name));
  await expect(cards.locator("svg[aria-hidden=true]")).toHaveCount(10);
  await expect(cards.locator(".home-service-card-summary")).toHaveCount(10);
  for (let i = 0; i < services.length; i++) {
    await expect(cards.nth(i)).toHaveAttribute(
      "href",
      `/layanan/${services[i][1]}`,
    );
    const summary = cards.nth(i).locator(".home-service-card-summary");
    expect((await summary.innerText()).trim().split(/\s+/)).toHaveLength(9);
    if (isMobile) await expect(summary).toBeHidden();
    else await expect(summary).toBeVisible();
  }
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
  if (isMobile) {
    for (const box of boxes) expect(box.bottom - box.y).toBe(96);
    expect(
      await cards
        .locator("h3")
        .evaluateAll((titles) =>
          titles.every((title) => title.scrollHeight <= title.clientHeight),
        ),
    ).toBe(true);
  }
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

test("service directory puts identity beside desktop descriptions and above mobile summaries", async ({
  page,
  isMobile,
}) => {
  await page.goto("/layanan");
  const cards = page.locator(".home-service-directory .home-service-card");
  await expect(cards).toHaveCount(10);
  for (let i = 0; i < services.length; i++) {
    const card = cards.nth(i);
    await expect(card).toHaveAttribute("href", `/layanan/${services[i][1]}`);
    await expect(card.locator("h3")).toHaveText(services[i][0]);
    const summary = card.locator(".home-service-summary");
    expect((await summary.textContent())!.trim().split(/\s+/)).toHaveLength(9);
    if (isMobile) {
      await expect(summary).toBeVisible();
      await expect(card.locator(".home-service-description")).toBeHidden();
    } else {
      await expect(summary).toBeHidden();
      await expect(card.locator(".home-service-description p")).toHaveCount(2);
      await expect(card.locator(".home-service-description")).toBeVisible();
    }
    const identity = (await card
      .locator(".home-service-identity")
      .boundingBox())!;
    const icon = (await card.locator("svg").boundingBox())!;
    const heading = (await card.locator("h3").boundingBox())!;
    const copy = (await card.locator(".home-service-copy").boundingBox())!;
    expect(icon.x + icon.width).toBeLessThan(heading.x);
    expect(icon.y).toBeLessThan(heading.y + heading.height);
    expect(heading.y).toBeLessThan(icon.y + icon.height);
    if (isMobile)
      expect(copy.y).toBeGreaterThanOrEqual(identity.y + identity.height);
    else expect(copy.x).toBeGreaterThanOrEqual(identity.x + identity.width);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("homepage team button sits below consultation text at half content width and opens the same tab", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.locator(".services-section");
  const button = section.getByRole("link", { name: "Tim Kami", exact: true });
  await expect(button).toHaveAttribute("href", "/tim-kami");
  expect(await button.getAttribute("target")).not.toBe("_blank");
  await expect(button.locator("svg")).toHaveCount(2);
  const note = (await section.locator(".service-note").boundingBox())!;
  const action = (await section.locator(".service-team-action").boundingBox())!;
  const box = (await button.boundingBox())!;
  expect(box.y).toBeGreaterThan(note.y + note.height);
  expect(Math.abs(box.width - action.width / 2)).toBeLessThan(1);
  expect(
    Math.abs(box.x + box.width / 2 - (action.x + action.width / 2)),
  ).toBeLessThan(1);
  await button.click();
  await expect(page).toHaveURL(/\/tim-kami$/);
  await expect(
    page.getByRole("heading", { name: "Tim Kami", exact: true }),
  ).toBeVisible();
});
