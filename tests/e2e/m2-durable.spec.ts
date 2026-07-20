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
  await page.getByRole("button", { name: "Load the demo article" }).click();
  await page.getByRole("button", { name: "Check article" }).click();
  await expect(page.getByText("9 findings ready to review.")).toBeVisible();
  await expect(page).toHaveURL(/\?run=[0-9a-f-]{36}$/);

  const durableUrl = page.url();
  await page.reload();
  await expect(page.getByText("9 findings ready to review.")).toBeVisible();

  const isolatedContext = await browser.newContext();
  const isolatedPage = await isolatedContext.newPage();
  await isolatedPage.goto(durableUrl);
  // A second anonymous user must not see the run: RLS denies the read, the
  // restore fails with 404, and the app surfaces the not-found error.
  await expect(
    isolatedPage
      .getByRole("alert")
      .filter({ hasText: "We couldn't find that saved analysis." }),
  ).toBeVisible();
  await isolatedContext.close();
});
