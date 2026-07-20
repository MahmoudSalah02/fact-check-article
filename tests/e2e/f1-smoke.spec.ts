import { expect, test } from "@playwright/test";

test("prepared article travels through the F1 product flow", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "PulseCheck" })).toBeVisible();
  await expect(page.getByText("What still holds up today?")).toBeVisible();
  await expect(page.getByText("Codex")).toBeVisible();
  await page.getByRole("button", { name: "Load demo article" }).click();
  await page.getByRole("button", { name: "Check article" }).click();

  await expect(page.getByText("9 findings ready to review.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "PulseCheck" })).toBeVisible();
  await expect(
    page
      .getByText(/Jennifer Granholm is the U\.S\. secretary of energy/)
      .first(),
  ).toBeVisible();
  await expect(page.getByRole("list", { name: "Findings" })).toBeVisible();
});
