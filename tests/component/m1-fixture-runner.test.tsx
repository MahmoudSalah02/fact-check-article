import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";

import demoExpected from "@/fixtures/demo-expected.json";
import { M1FixtureRunner } from "@/components/m1-fixture-runner";

let demoArticle: string;

beforeAll(async () => {
  demoArticle = (
    await readFile(join(process.cwd(), "fixtures", "demo-article.txt"), "utf8")
  ).trim();
});

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
