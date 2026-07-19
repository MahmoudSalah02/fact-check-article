import { expect, test } from "@playwright/test";

test.skip(
  process.env.E2E_DATA_BACKEND !== "supabase",
  "requires the local or Preview Supabase backend",
);

test("a run survives refresh and remains isolated from another browser", async ({
  browser,
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Load demo article" }).click();
  await page.getByRole("button", { name: "Check article" }).click();
  await expect(page.getByText("9 findings loaded")).toBeVisible();
  await expect(page).toHaveURL(/\?run=[0-9a-f-]{36}$/);

  const durableUrl = page.url();
  await page.reload();
  await expect(page.getByText("9 findings loaded")).toBeVisible();

  const isolatedContext = await browser.newContext();
  const isolatedPage = await isolatedContext.newPage();
  await isolatedPage.goto(durableUrl);
  // Scope past Next.js's always-present empty route announcer (which also has
  // role="alert") to our own error alert.
  await expect(
    isolatedPage.getByRole("alert").filter({ hasText: "Run not found" }),
  ).toBeVisible();
  await isolatedContext.close();
});
