import { test, expect, type Locator } from "@playwright/test";

test("partnership FAQ starts closed, toggles exclusively, and resets after refresh", async ({
  page,
  isMobile,
}) => {
  await page.goto("/kemitraan");
  const faq = page.locator("#mr-faq");
  const items = faq.locator("details");
  await expect(items).toHaveCount(4);
  await expect(faq.locator("details[open]")).toHaveCount(0);
  const answers = await items.locator("p").allTextContents();
  const activate = async (summary: Locator) => {
    if (isMobile) await summary.tap();
    else await summary.click();
  };
  // Every summary keeps its native disclosure marker and toggles both ways.
  for (const item of await items.all()) {
    const summary = item.locator("summary");
    await expect(item.locator("p")).toBeHidden();
    await expect(summary).toHaveCSS("display", "list-item");
    await activate(summary);
    await expect(item).toHaveAttribute("open", "");
    await expect(item.locator("p")).toBeVisible();
    await activate(summary);
    await expect(item).not.toHaveAttribute("open");
    await expect(item.locator("p")).toBeHidden();
  }
  // Opening another question closes the previous one, including last to first.
  for (let i = 0; i <= 4; i++) {
    const selected = i % 4;
    await activate(items.nth(selected).locator("summary"));
    await expect(faq.locator("details[open]")).toHaveCount(1);
    for (let j = 0; j < 4; j++) {
      if (j === selected) await expect(items.nth(j).locator("p")).toBeVisible();
      else await expect(items.nth(j).locator("p")).toBeHidden();
    }
  }
  await faq.screenshot({
    path: `work/faq-${isMobile ? "mobile" : "desktop"}-open.png`,
  });
  // Refresh resets the disclosure state regardless of which question was open.
  for (let i = 0; i < 4; i++) {
    await page.reload();
    await expect(faq.locator("details[open]")).toHaveCount(0);
    for (const answer of await items.locator("p").all())
      await expect(answer).toBeHidden();
    expect(await items.locator("p").allTextContents()).toEqual(answers);
    await activate(items.nth(i).locator("summary"));
    await expect(items.nth(i).locator("p")).toBeVisible();
  }
  await page.reload();
  await expect(faq.locator("details[open]")).toHaveCount(0);
  await faq.screenshot({
    path: `work/faq-${isMobile ? "mobile" : "desktop"}-closed.png`,
  });
});
