import { expect, test } from "@playwright/test";

test("prepared article travels through the M1 fake vertical slice", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "PulseCheck" })).toBeVisible();
  await page.getByRole("button", { name: "Load demo article" }).click();
  await page.getByRole("button", { name: "Check article" }).click();

  await expect(page.getByText("9 findings loaded")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Typed fixture result" }),
  ).toBeVisible();
  await expect(page.getByText(/energy-secretary/)).toBeVisible();
});
