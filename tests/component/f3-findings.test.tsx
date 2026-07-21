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
  await user.click(screen.getByRole("button", { name: "Use demo" }));
  await user.click(screen.getByRole("button", { name: "Start check" }));
  await screen.findByText("9 claims checked");
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
  it("renders all verdicts as accessible, keyboard-operable markers", async () => {
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
    expect(screen.queryByRole("tooltip")).toBeNull();
    await user.hover(outdated);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Outdated");
    await user.unhover(outdated);
    expect(screen.queryByRole("tooltip")).toBeNull();

    outdated.focus();
    await waitFor(() =>
      expect(screen.getByRole("tooltip")).toHaveTextContent("Outdated"),
    );
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("complementary", { name: "Evidence panel" }),
    ).toBeVisible();
    expect(outdated).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Close evidence panel" }),
    ).toBeVisible();
    expect(outdated).toHaveFocus();

    await user.click(
      screen.getByRole("button", { name: "Close evidence panel" }),
    );
    await waitFor(() => expect(outdated).toHaveFocus());
  });

  it.each([
    "Verified",
    "Outdated",
    "Contradicted",
    "Unsupported",
    "Needs context",
    "Unresolved",
    "Opinion",
  ])("offers Accept and Reject for the %s verdict", async (verdict) => {
    const { user } = await renderCompletedApp();
    await user.click(
      screen.getAllByRole("button", {
        name: new RegExp(`^${verdict}:`),
      })[0]!,
    );

    const panel = screen.getByRole("complementary", {
      name: "Evidence panel",
    });
    expect(within(panel).getByRole("button", { name: "Accept" })).toBeVisible();
    expect(within(panel).getByRole("button", { name: "Reject" })).toBeVisible();
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

  it("starts with the original wording and no version-mode controls", async () => {
    await renderCompletedApp();

    expect(screen.getByTestId("article-text")).toHaveAttribute(
      "data-version",
      "current",
    );
    expect(screen.queryByRole("button", { name: "updated" })).toBeNull();
    expect(screen.queryByRole("button", { name: "original" })).toBeNull();
    expect(document.querySelector("del")).toBeNull();
  });

  it("keeps every checked claim in one continuous review", async () => {
    await renderCompletedApp();
    const markerName =
      /^(Verified|Outdated|Contradicted|Unsupported|Needs context|Unresolved|Opinion):/;

    expect(screen.getByText("9 claims checked")).toBeVisible();
    expect(screen.getAllByRole("button", { name: markerName })).toHaveLength(9);
    expect(screen.queryByRole("group", { name: "Filter findings" })).toBeNull();
  });

  it("applies an accepted correction directly in the article", async () => {
    const { user, container } = await renderCompletedApp();
    await user.click(
      screen.getByRole("button", {
        name: /Outdated: Jennifer Granholm/,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Accept" }));

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

  it("accepts and rejects the same correction in place", async () => {
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
    expect(article).toHaveAttribute("data-version", "current");
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(container.querySelector("del")).not.toBeInTheDocument();
    expect(article.dataset.updatedText).toBe(demoArticle);
    const panel = screen.getByRole("complementary", {
      name: "Evidence panel",
    });
    expect(within(panel).getByRole("status")).toHaveTextContent(
      "Decision: rejected",
    );

    await user.click(screen.getByRole("button", { name: "Accept" }));
    expect(within(panel).getByRole("status")).toHaveTextContent(
      "Decision: accepted",
    );
    expect(container.querySelector("del")).toHaveTextContent(
      "Jennifer Granholm is the U.S. secretary of energy",
    );
  });

  it("navigates findings and offers decisions without inventing false edits", async () => {
    const { user } = await renderCompletedApp();
    await user.click(
      screen.getByRole("button", {
        name: /Outdated: Jennifer Granholm/,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Next finding" }));
    expect(screen.getByText("Forecast · revised")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Previous finding" }));
    expect(screen.getByText("2 of 9")).toBeVisible();

    await user.click(
      screen.getByRole("button", {
        name: /Opinion: The grid is unquestionably/,
      }),
    );
    const panel = screen.getByRole("complementary", {
      name: "Evidence panel",
    });
    expect(within(panel).getByRole("button", { name: "Accept" })).toBeVisible();
    expect(within(panel).getByRole("button", { name: "Reject" })).toBeVisible();
    expect(screen.getByText("Does this assessment look right?")).toBeVisible();

    await user.click(within(panel).getByRole("button", { name: "Accept" }));
    expect(within(panel).getByRole("status")).toHaveTextContent(
      "Decision: accepted",
    );
    expect(screen.queryByRole("button", { name: "updated" })).toBeNull();
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
