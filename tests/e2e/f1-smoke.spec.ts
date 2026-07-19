import { expect, test } from "@playwright/test";

test("prepared article travels through the F1 fixture-backed product flow", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "PulseCheck" })).toBeVisible();
  await page.getByRole("button", { name: "Load demo article" }).click();
  await page.getByRole("button", { name: "Check article" }).click();

  await expect(page.getByText("9 findings ready to review.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Analysis ready" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Article text" })).toHaveValue(
    /Jennifer Granholm is the U\.S\. secretary of energy/,
  );
});
