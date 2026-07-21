import { expect, test } from "@playwright/test";

test.skip(
  process.env.E2E_DATA_BACKEND !== "supabase",
  "requires the local or Preview Supabase backend",
);

test("a run survives refresh and appears in the shared recent gallery", async ({
  browser,
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Use demo" }).click();
  await page.getByRole("button", { name: "Start check" }).click();
  await expect(page.getByText("9 claims checked")).toBeVisible();
  await expect(page).toHaveURL(/\?run=[0-9a-f-]{36}$/);

  const durableUrl = page.url();
  await page.reload();
  await expect(page.getByText("9 claims checked")).toBeVisible();

  await page.getByRole("button", { name: "New check" }).click();
  await page.getByRole("button", { name: "Use demo" }).click();
  await page.getByRole("button", { name: "Start check" }).click();
  await expect(page.getByText("9 claims checked")).toBeVisible();
  await expect(page).toHaveURL(durableUrl);

  const isolatedContext = await browser.newContext();
  const isolatedPage = await isolatedContext.newPage();
  await isolatedPage.goto("/");
  await isolatedPage
    .getByRole("button", { name: /U\.S\. electricity demand had remained/ })
    .first()
    .click();
  await expect(isolatedPage.getByText("9 claims checked")).toBeVisible();
  await expect(isolatedPage).toHaveURL(durableUrl);

  await isolatedPage.getByRole("button", { name: "Reject" }).click();
  await expect(isolatedPage.getByText("Decision: rejected")).toBeVisible();
  await isolatedPage.reload();
  await expect(isolatedPage.getByText("Decision: rejected")).toBeVisible();
  await isolatedContext.close();
});
