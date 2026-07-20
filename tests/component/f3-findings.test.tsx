import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";

import demoExpected from "@/fixtures/demo-expected.json";
import { EvidencePanel } from "@/components/evidence-panel";
import { PulseCheckApp } from "@/components/pulsecheck-app";
import type { Confidence, Finding, ForecastStatus } from "@/lib/contracts";

let demoArticle: string;

beforeAll(async () => {
  demoArticle = (
    await readFile(join(process.cwd(), "fixtures/demo-article.txt"), "utf8")
  ).trim();
});

async function renderCompletedApp() {
  const user = userEvent.setup();
  const view = render(
    <PulseCheckApp demoArticle={demoArticle} demoExpected={demoExpected} />,
  );
  await user.click(screen.getByRole("button", { name: "Load demo article" }));
  await user.click(screen.getByRole("button", { name: "Check article" }));
  await screen.findByText("9 findings ready to review.");
  return { user, ...view };
}

function metadataFinding(
  confidence: Confidence,
  forecastStatus: ForecastStatus | null = null,
): Finding {
  return {
    id: `metadata-${confidence}-${forecastStatus ?? "none"}`,
    sourceText: "A forecast claim",
    prefixText: null,
    suffixText: null,
    claimType: forecastStatus ? "forecast" : "fact",
    verdict: "verified",
    forecastStatus,
    confidence,
    explanation: "The available evidence supports this classification.",
    replacement: null,
    sources: [],
    startOffset: 0,
    endOffset: 16,
    checkedAt: "2026-07-18",
  };
}

function renderMetadataPanel(finding: Finding) {
  render(
    <EvidencePanel
      finding={finding}
      decision={null}
      position={1}
      total={1}
      isSaving={false}
      error={null}
      onDecision={() => undefined}
      onPrevious={() => undefined}
      onNext={() => undefined}
      onClose={() => undefined}
    />,
  );
}

describe("F3 inline findings experience", () => {
  it("renders all verdicts as accessible, keyboard-operable dots", async () => {
    const { user } = await renderCompletedApp();
    const expectedLabels = [
      "Verified:",
      "Outdated:",
      "Contradicted:",
      "Unsupported:",
      "Needs context:",
      "Unresolved:",
      "Opinion:",
    ];

    for (const label of expectedLabels) {
      expect(
        screen.getAllByRole("button", { name: new RegExp(`^${label}`) }).length,
      ).toBeGreaterThan(0);
    }

    const outdated = screen.getByRole("button", {
      name: /Outdated: Jennifer Granholm/,
    });
    outdated.focus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("complementary", { name: "Evidence panel" }),
    ).toBeVisible();
    expect(outdated).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Close evidence panel" }),
    ).toHaveFocus();

    await user.keyboard("{Enter}");
    await waitFor(() => expect(outdated).toHaveFocus());
  });

  it("shows the required evidence and safe source links", async () => {
    const { user } = await renderCompletedApp();
    await user.click(
      screen.getByRole("button", {
        name: /Inspect evidence: Jennifer Granholm/,
      }),
    );

    const panel = screen.getByRole("complementary", {
      name: "Evidence panel",
    });
    expect(within(panel).getByText("Outdated")).toBeVisible();
    expect(within(panel).getByText("high confidence")).toBeVisible();
    expect(
      within(panel).getByText(/Department of Energy lists Chris Wright/),
    ).toBeVisible();
    expect(within(panel).getByText("Checked 2026-07-18")).toBeVisible();
    const source = within(panel).getByRole("link", {
      name: /Leadership & Organization/,
    });
    expect(source).toHaveAttribute("target", "_blank");
    expect(source).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("explains why Updated matches Original until an edit is accepted", async () => {
    await renderCompletedApp();

    expect(screen.getByTestId("article-text")).toHaveAttribute(
      "data-version",
      "original",
    );
    expect(screen.getByRole("button", { name: "updated" })).toBeDisabled();
    expect(
      screen.getByText("Accept a correction to create the Updated version"),
    ).toBeVisible();
  });

  it("filters inline findings with counts and category-scoped navigation", async () => {
    const { user } = await renderCompletedApp();
    const dotName =
      /^(Verified|Outdated|Contradicted|Unsupported|Needs context|Unresolved|Opinion):/;

    await user.click(screen.getByRole("button", { name: "Facts: 5 findings" }));
    expect(screen.getByText("5 of 9 facts shown.")).toBeVisible();
    expect(screen.getAllByRole("button", { name: dotName })).toHaveLength(5);

    await user.click(
      screen.getByRole("button", { name: "Forecasts: 3 findings" }),
    );
    expect(screen.getByText("3 of 9 forecasts shown.")).toBeVisible();
    expect(screen.getAllByRole("button", { name: dotName })).toHaveLength(3);

    await user.click(
      screen.getByRole("button", {
        name: /Outdated: Lawrence Berkeley National Laboratory/,
      }),
    );
    expect(screen.getByText("Finding 1 of 3")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Finding 2 of 3")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Opinions: 1 finding" }),
    );
    expect(screen.getByText("1 of 9 opinions shown.")).toBeVisible();
    expect(screen.getAllByRole("button", { name: dotName })).toHaveLength(1);
    expect(
      screen.queryByRole("complementary", { name: "Evidence panel" }),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "All: 9 findings" }));
    expect(screen.getByText("9 findings ready to review.")).toBeVisible();
    expect(screen.getAllByRole("button", { name: dotName })).toHaveLength(9);
  });

  it("keeps accepted edits in Updated while filtering annotations", async () => {
    const { user, container } = await renderCompletedApp();
    await user.click(
      screen.getByRole("button", {
        name: /Outdated: Jennifer Granholm/,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Accept" }));
    await user.click(
      screen.getByRole("button", { name: "Forecasts: 3 findings" }),
    );

    expect(screen.getByTestId("article-text").dataset.updatedText).toBe(
      demoArticle.replace(
        "Jennifer Granholm is the U.S. secretary of energy",
        "Chris Wright is the U.S. secretary of energy",
      ),
    );
    expect(container.querySelector("del")).toHaveTextContent(
      "Jennifer Granholm is the U.S. secretary of energy",
    );
    expect(container.querySelector("ins")).toHaveTextContent(
      "Chris Wright is the U.S. secretary of energy",
    );
  });

  it("accepts, rejects, restores, and toggles Original/Updated exactly", async () => {
    const { user, container } = await renderCompletedApp();
    await user.click(
      screen.getByRole("button", {
        name: /Outdated: Jennifer Granholm/,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Accept" }));

    const article = screen.getByTestId("article-text");
    const expectedUpdatedArticle = demoArticle.replace(
      "Jennifer Granholm is the U.S. secretary of energy",
      "Chris Wright is the U.S. secretary of energy",
    );
    expect(article.dataset.updatedText).toBe(expectedUpdatedArticle);
    expect(container.querySelector("del")).toHaveTextContent(
      "Jennifer Granholm is the U.S. secretary of energy",
    );
    expect(container.querySelector("ins")).toHaveTextContent(
      "Chris Wright is the U.S. secretary of energy",
    );
    expect(article).toHaveAttribute("data-version", "updated");
    expect(screen.getByText("1 accepted edit in Updated")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "original" }));
    expect(container.querySelector("del")).not.toBeInTheDocument();
    expect(article).toHaveAttribute("data-version", "original");

    await user.click(screen.getByRole("button", { name: "updated" }));
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(container.querySelector("del")).not.toBeInTheDocument();
    expect(article.dataset.updatedText).toBe(demoArticle);
    const panel = screen.getByRole("complementary", {
      name: "Evidence panel",
    });
    expect(within(panel).getByRole("status")).toHaveTextContent(
      "Decision: rejected",
    );

    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect(within(panel).getByRole("status")).toHaveTextContent(
      "Decision: restored",
    );
    expect(article.dataset.updatedText).toBe(demoArticle);
  });

  it("navigates findings and exposes forecast status without offering false edits", async () => {
    const { user } = await renderCompletedApp();
    await user.click(
      screen.getByRole("button", {
        name: /Outdated: Jennifer Granholm/,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Forecast · revised")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("Finding 2 of 9")).toBeVisible();

    await user.click(
      screen.getByRole("button", {
        name: /Opinion: The grid is unquestionably/,
      }),
    );
    const panel = screen.getByRole("complementary", {
      name: "Evidence panel",
    });
    expect(within(panel).queryByRole("button", { name: "Accept" })).toBeNull();
    expect(within(panel).queryByRole("button", { name: "Reject" })).toBeNull();
  });

  it("closes the panel and retains a calm article-first layout", async () => {
    const { user } = await renderCompletedApp();
    await user.click(
      screen.getByRole("button", {
        name: /Unsupported: Every U.S. data center/,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Close evidence panel" }),
    );
    expect(
      screen.queryByRole("complementary", { name: "Evidence panel" }),
    ).toBeNull();
    expect(
      screen.getByRole("region", { name: "Checked article" }),
    ).toBeVisible();
  });
});

describe("F3 evidence metadata matrix", () => {
  it.each(["high", "medium", "low"] as const)(
    "renders %s confidence without a percentage",
    (confidence) => {
      renderMetadataPanel(metadataFinding(confidence));
      expect(screen.getByText(`${confidence} confidence`)).toBeVisible();
      expect(screen.queryByText(/%/)).toBeNull();
    },
  );

  it.each([
    "pending",
    "on_track",
    "revised",
    "fulfilled",
    "missed",
    "not_measurable",
  ] as const)("renders forecast status %s textually", (forecastStatus) => {
    renderMetadataPanel(metadataFinding("high", forecastStatus));
    expect(
      screen.getByText(`Forecast · ${forecastStatus.replaceAll("_", " ")}`),
    ).toBeVisible();
  });
});
