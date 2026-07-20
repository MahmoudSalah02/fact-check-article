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
  const roleFinding = page.getByRole("button", {
    name: /Outdated: Jennifer Granholm is the U\.S\. secretary of energy/,
  });
  await expect(roleFinding).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /^(Verified|Outdated|Contradicted|Unsupported|Needs context|Unresolved|Opinion):/,
    }),
  ).toHaveCount(9);

  await roleFinding.click();
  await expect(
    page.getByRole("complementary", { name: "Evidence panel" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.locator("del")).toContainText("Jennifer Granholm");
  await expect(page.locator("ins")).toContainText("Chris Wright");

  await page.getByRole("button", { name: "original", exact: true }).click();
  await expect(page.locator("del")).toHaveCount(0);
  await page.getByRole("button", { name: "updated", exact: true }).click();
  await expect(page.locator("ins")).toContainText("Chris Wright");
});
