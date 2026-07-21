import { expect, test } from "@playwright/test";

test("prepared article travels through the F1 product flow", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Fact-check any article. Keep it current.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/check claims against current sources/i),
  ).toBeVisible();
  await expect(page.getByText("Codex")).toBeVisible();
  const sidebar = page.getByRole("complementary", {
    name: "Product sidebar",
  });
  await expect(sidebar).toHaveCSS("border-right-width", "0px");
  await expect(sidebar).toHaveCSS("box-shadow", /rgb\(27, 27, 27\)/);
  await page.getByRole("button", { name: "Use demo" }).click();
  await page.getByRole("button", { name: "Start check" }).click();

  await expect(page.getByText("9 claims checked")).toBeVisible();
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

  await expect(
    page.getByRole("complementary", { name: "Evidence panel" }),
  ).toBeVisible();
  const acceptButton = page.getByRole("button", { name: "Accept" });
  await expect(acceptButton).toHaveCSS("color", "rgb(23, 23, 23)");
  await expect(acceptButton).toHaveCSS(
    "background-color",
    "rgb(212, 212, 212)",
  );
  await acceptButton.click();
  await expect(page.locator("del")).toContainText("Jennifer Granholm");
  await expect(page.locator("ins")).toContainText("Chris Wright");

  await page.getByRole("button", { name: "Reject" }).click();
  await expect(page.locator("del")).toHaveCount(0);
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.locator("ins")).toContainText("Chris Wright");
});
