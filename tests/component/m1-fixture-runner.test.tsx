import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import demoExpected from "@/fixtures/demo-expected.json";
import { M1FixtureRunner } from "@/components/m1-fixture-runner";

const demoArticle =
  "U.S. electricity demand had remained nearly flat for roughly two decades, and Jennifer Granholm is the U.S. secretary of energy. Lawrence Berkeley National Laboratory currently estimates that data centers could account for 6.7% to 12.0% of U.S. electricity use by 2028, and that forecast has never been updated. A newer analysis puts the 2030 share at only 2%. Every U.S. data center project is fully funded, so data centers will consume exactly 649 TWh in 2030 and all planned facilities will be operating by then. The grid is unquestionably the biggest threat to U.S. AI leadership.";

describe("M1 fixture runner", () => {
  it("loads and checks the prepared article", async () => {
    const user = userEvent.setup();
    render(
      <M1FixtureRunner demoArticle={demoArticle} demoExpected={demoExpected} />,
    );

    await user.click(screen.getByRole("button", { name: "Load demo article" }));
    expect(screen.getByRole("textbox", { name: "Article" })).toHaveValue(
      demoArticle,
    );

    await user.click(screen.getByRole("button", { name: "Check article" }));
    expect(await screen.findByText("9 findings loaded")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Typed fixture result" }),
    ).toBeVisible();
    expect(screen.getByText(/energy-secretary/)).toBeVisible();
  });
});
