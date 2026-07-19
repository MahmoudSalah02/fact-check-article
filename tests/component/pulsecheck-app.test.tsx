import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import demoExpected from "@/fixtures/demo-expected.json";
import { MAX_ARTICLE_LENGTH } from "@/components/article-editor";
import { PulseCheckApp } from "@/components/pulsecheck-app";
import type { CreateRunResult, RunClient } from "@/lib/contracts";

let demoArticle: string;

beforeAll(async () => {
  demoArticle = (
    await readFile(join(process.cwd(), "fixtures", "demo-article.txt"), "utf8")
  ).trim();
});

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

function renderPulseCheck(runClient?: RunClient) {
  return render(
    <PulseCheckApp
      demoArticle={demoArticle}
      demoExpected={demoExpected}
      runClient={runClient}
    />,
  );
}

describe("F1 PulseCheck article input", () => {
  it("renders the empty state with the product shell and a disabled check action", () => {
    renderPulseCheck();

    expect(screen.getByRole("link", { name: "PulseCheck" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("ChatGPT")).toBeVisible();
    expect(screen.getByText("Codex")).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 1, name: "PulseCheck" }),
    ).toBeVisible();
    expect(
      screen.getByText("Concept prototype; not an official OpenAI product."),
    ).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: "Article text" }),
    ).toHaveAttribute("placeholder", "Paste an article to check…");
    expect(
      screen.getByRole("button", { name: "Check article" }),
    ).toBeDisabled();
    expect(
      screen.getByText(/do not paste secrets or information/i),
    ).toBeVisible();
  });

  it("enters the ready state as the user types", async () => {
    const user = userEvent.setup();
    renderPulseCheck();

    const article = screen.getByRole("textbox", { name: "Article text" });
    await user.type(article, "A checkable statement.");

    expect(article).toHaveValue("A checkable statement.");
    expect(screen.getByRole("button", { name: "Check article" })).toBeEnabled();
    expect(screen.getByText("22 / 20,000 characters")).toBeVisible();
  });

  it("supports the empty-state journey from the keyboard", async () => {
    const user = userEvent.setup();
    renderPulseCheck();

    await user.tab();
    expect(screen.getByRole("link", { name: "PulseCheck" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("textbox", { name: "Article text" })).toHaveFocus();

    await user.tab();
    const loadDemo = screen.getByRole("button", {
      name: "Load demo article",
    });
    expect(loadDemo).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.getByRole("textbox", { name: "Article text" })).toHaveValue(
      demoArticle,
    );
  });

  it("blocks an oversized article before it reaches the run client", () => {
    const createRun = vi.fn<RunClient["createRun"]>(async () => {
      throw new Error("The oversized article must not be submitted");
    });
    const runClient: RunClient = {
      createRun,
      getRun: async () => {
        throw new Error("The oversized article must not be retrieved");
      },
    };
    renderPulseCheck(runClient);

    fireEvent.change(screen.getByRole("textbox", { name: "Article text" }), {
      target: { value: "a".repeat(MAX_ARTICLE_LENGTH + 1) },
    });

    expect(
      screen.getByText(/Shorten the article to 20,000 characters or fewer/),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Check article" }),
    ).toBeDisabled();
    expect(createRun).not.toHaveBeenCalled();
  });

  it("locks the article in the checking state while retaining its text", async () => {
    const user = userEvent.setup();
    const deferredRun = createDeferred<CreateRunResult>();
    const runClient: RunClient = {
      createRun: vi.fn(() => deferredRun.promise),
      getRun: async () => {
        throw new Error("A run cannot be retrieved before it is created");
      },
    };
    renderPulseCheck(runClient);

    await user.click(screen.getByRole("button", { name: "Load demo article" }));
    await user.click(screen.getByRole("button", { name: "Check article" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Researching and validating claims…",
    );
    expect(
      screen.getByRole("progressbar", {
        name: "Article analysis in progress",
      }),
    ).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Article text" })).toHaveValue(
      demoArticle,
    );
    expect(
      screen.getByRole("textbox", { name: "Article text" }),
    ).toHaveAttribute("readonly");
    expect(
      screen.getByRole("button", { name: "Checking article…" }),
    ).toBeDisabled();

    deferredRun.reject(new Error("Fixture service unavailable"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't check the article. Please try again.",
    );
  });

  it("loads and checks the prepared article through the fixture client", async () => {
    const user = userEvent.setup();
    renderPulseCheck();

    await user.click(screen.getByRole("button", { name: "Load demo article" }));
    expect(screen.getByRole("textbox", { name: "Article text" })).toHaveValue(
      demoArticle,
    );

    await user.click(screen.getByRole("button", { name: "Check article" }));
    expect(
      await screen.findByText("9 findings ready to review."),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Analysis ready" }),
    ).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Article text" })).toHaveValue(
      demoArticle,
    );
  });

  it("shows the honest fixture error for a non-demo article and can reset", async () => {
    const user = userEvent.setup();
    renderPulseCheck();

    const article = screen.getByRole("textbox", { name: "Article text" });
    await user.type(article, "This is not the prepared article.");
    await user.click(screen.getByRole("button", { name: "Check article" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This prototype can only check the prepared demo article",
    );
    expect(article).toHaveValue("This is not the prepared article.");

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(article).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "Check article" }),
    ).toBeDisabled();
  });
});
