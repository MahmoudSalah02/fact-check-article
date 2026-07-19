import { z } from "zod";

import {
  AnalysisFindingSchema,
  AnalysisOutputSchema,
  type AnalysisOutput,
} from "@/lib/contracts";
import type {
  AnalysisProvider,
  AnalysisRequest,
  AnalysisSubmission,
} from "@/lib/analysis/provider";

const FixtureEnvelopeSchema = z
  .object({
    asOfDate: z.iso.date(),
    findings: z.array(z.object({ checkedAt: z.iso.date() }).passthrough()),
  })
  .strict();

export type ParsedDemoFixture = {
  asOfDate: string;
  output: AnalysisOutput;
};

export function parseDemoFixture(input: unknown): ParsedDemoFixture {
  const envelope = FixtureEnvelopeSchema.parse(input);
  const findings = envelope.findings.map((rawFinding) => {
    const { checkedAt, ...candidate } = rawFinding;
    if (checkedAt !== envelope.asOfDate) {
      throw new Error("Fixture finding checkedAt must match asOfDate");
    }
    return AnalysisFindingSchema.parse(candidate);
  });

  return {
    asOfDate: envelope.asOfDate,
    output: AnalysisOutputSchema.parse({ findings }),
  };
}

export class FixtureAnalysisProvider implements AnalysisProvider {
  readonly #articleText: string;
  readonly #fixture: ParsedDemoFixture;
  readonly #submissions = new Set<string>();

  constructor(articleText: string, fixtureInput: unknown) {
    this.#articleText = articleText;
    this.#fixture = parseDemoFixture(fixtureInput);
  }

  get checkedAt() {
    return this.#fixture.asOfDate;
  }

  async start(request: AnalysisRequest): Promise<AnalysisSubmission> {
    if (request.articleText !== this.#articleText) {
      throw new Error(
        "M1 fixture analysis only supports the prepared demo article",
      );
    }
    if (request.checkedAt !== this.#fixture.asOfDate) {
      throw new Error("Fixture runs must use the fixture as-of date");
    }

    const providerRunId = `fixture:${request.runId}`;
    this.#submissions.add(providerRunId);
    return { providerRunId };
  }

  async retrieve(providerRunId: string): Promise<AnalysisOutput> {
    if (!this.#submissions.has(providerRunId)) {
      throw new Error("Unknown fixture analysis submission");
    }
    return structuredClone(this.#fixture.output);
  }
}
