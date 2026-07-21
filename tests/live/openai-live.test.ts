// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  normalizeReplacements,
  resolveModelFindings,
} from "@/lib/server/analysis-completion";
import { createOpenAiTransport } from "@/lib/server/openai/transport";

// Live end-to-end harness for the real OpenAI pipeline. Opt-in only — it spends
// money and needs OPENAI_API_KEY/OPENAI_MODEL. Run with:
//   pnpm test:live
// It exercises the exact functions the app's completion path uses (transport →
// normalizeReplacements → resolveModelFindings) against five diverse articles
// and reports kept/dropped findings per article.
const LIVE = process.env.OPENAI_LIVE === "1" && !!process.env.OPENAI_API_KEY;

const ARTICLES: { name: string; text: string }[] = [
  {
    name: "ocr-launch (arrows, newline-in-quote, stats)",
    text: "Baidu just open-sourced an OCR model that reads entire 40-page documents in one shot.\n\nIt's called Unlimited-OCR. 3 billion parameters but only 500 million active during inference. Runs 100% locally on your machine.\n\nWhy this matters: traditional OCR tools chop documents page by page. Tables that span two pages break. Reading order gets lost.\n\n→ 93% accuracy on the standard benchmark.\n→ 2.12 million downloads on Hugging Face last month. 14,600 GitHub\nstars.\n\nFor context: Amazon Textract, Google Cloud Vision, and Azure Document Intelligence all charge per page. This runs locally for free.",
  },
  {
    name: "energy-roles (outdated officeholder, forecasts)",
    text: "U.S. electricity demand has been flat for two decades, and Jennifer Granholm is the U.S. secretary of energy. Lawrence Berkeley National Laboratory estimates that data centers could account for 6.7% to 12% of U.S. electricity use by 2028, and that forecast has never been updated. Every data center project announced this year is fully funded, so the grid is unquestionably the biggest threat to U.S. AI leadership.",
  },
  {
    name: "markets (volatile numbers, absolutes)",
    text: "Apple is the most valuable company in the world, with a market capitalization above 4 trillion dollars. The iPhone always outsells every Android flagship in the United States. Apple's services revenue grew 20% last quarter, its best result ever, and Tim Cook remains the company's CEO.",
  },
  {
    name: "opinion-forecast (subjective + predictions)",
    text: "Electric cars are simply better than gasoline cars in every way that matters. Global EV sales will double by 2027. Battery prices have fallen more than 80% since 2013. In my view, charging anxiety is a solved problem, and anyone who disagrees hasn't driven a modern EV. Norway already sees more than 90% of new car sales being electric.",
  },
  {
    name: "unicode-repeats (emoji, repeated phrase, anchors)",
    text: "The launch was a success 🚀 and the team celebrated. Revenue doubled. The launch was a success 🚀 according to the CEO, who founded the company in 2019. The startup is headquartered in Berlin and employs 250 people. Café Tortoni in Buenos Aires — founded in 1858 — is often called the oldest café in Argentina.",
  },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Outcome = {
  name: string;
  status: string;
  raw: number;
  kept: number;
  spanExact: boolean;
  keptSummary: string[];
};

async function runPipeline(name: string, text: string): Promise<Outcome> {
  const transport = createOpenAiTransport();
  const checkedAt = new Date().toISOString().slice(0, 10);
  const { responseId } = await transport.submit(text, checkedAt);
  const startedAt = Date.now();

  for (;;) {
    const result = await transport.fetchResult(responseId);
    if (result.status === "pending") {
      if (Date.now() - startedAt > 240_000) {
        return {
          name,
          status: "timeout",
          raw: 0,
          kept: 0,
          spanExact: true,
          keptSummary: [],
        };
      }
      await sleep(5000);
      continue;
    }
    if (result.status === "failed") {
      return {
        name,
        status: result.errorCode,
        raw: 0,
        kept: 0,
        spanExact: true,
        keptSummary: [],
      };
    }

    const normalized = normalizeReplacements(result.rawOutput) as {
      findings?: unknown[];
    };
    const raw = Array.isArray(normalized.findings) ? normalized.findings : [];
    const kept = resolveModelFindings(text, checkedAt, raw, result.evidence);
    const spanExact = kept.every(
      (finding) =>
        text.slice(finding.startOffset, finding.endOffset) ===
        finding.sourceText,
    );
    return {
      name,
      status: "completed",
      raw: raw.length,
      kept: kept.length,
      spanExact,
      keptSummary: kept.map(
        (finding) =>
          `${finding.verdict}/${finding.confidence}${finding.replacement ? " +edit" : ""}`,
      ),
    };
  }
}

describe.skipIf(!LIVE)("live OpenAI pipeline", () => {
  it(
    "processes five diverse articles end to end",
    { timeout: 360_000 },
    async () => {
      const outcomes = await Promise.all(
        ARTICLES.map(({ name, text }) => runPipeline(name, text)),
      );

      const lines = ["", "===== LIVE PIPELINE REPORT ====="];
      for (const outcome of outcomes) {
        lines.push(
          `${outcome.status === "completed" && outcome.kept > 0 ? "PASS" : "FAIL"}  ${outcome.name}` +
            ` — status=${outcome.status} raw=${outcome.raw} kept=${outcome.kept}` +
            ` spanExact=${outcome.spanExact}`,
        );
        if (outcome.keptSummary.length > 0) {
          lines.push(`      verdicts: ${outcome.keptSummary.join(", ")}`);
        }
      }
      lines.push("================================", "");
      process.stdout.write(lines.join("\n"));

      for (const outcome of outcomes) {
        expect.soft(outcome.status, outcome.name).toBe("completed");
        expect.soft(outcome.kept, `${outcome.name} kept`).toBeGreaterThan(0);
        expect.soft(outcome.spanExact, `${outcome.name} spans`).toBe(true);
      }

      // Aggregate keep-rate sanity: the tolerance layer should keep most of
      // what the model produced across the whole batch.
      const totals = outcomes.reduce(
        (acc, o) => ({ raw: acc.raw + o.raw, kept: acc.kept + o.kept }),
        { raw: 0, kept: 0 },
      );
      expect(
        totals.kept / Math.max(totals.raw, 1),
        `overall keep rate (${totals.kept}/${totals.raw})`,
      ).toBeGreaterThanOrEqual(0.6);
    },
  );
});
