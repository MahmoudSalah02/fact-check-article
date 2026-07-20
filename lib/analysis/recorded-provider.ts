import type {
  AnalysisProvider,
  AnalysisRequest,
  AnalysisSubmission,
} from "@/lib/analysis/provider";
import {
  parseAndValidateAnalysisOutput,
  type AnalysisEvidence,
} from "@/lib/analysis/validate-output";
import type { AnalysisOutput } from "@/lib/contracts";

export type RecordedAnalysisCase = {
  id: string;
  articleText: string;
  checkedAt: string;
  rawOutput: unknown;
  evidence: AnalysisEvidence;
};

type RecordedSubmission = {
  request: AnalysisRequest;
  recordedCase: RecordedAnalysisCase;
};

function caseKey(articleText: string, checkedAt: string): string {
  return JSON.stringify([articleText, checkedAt]);
}

export class RecordedAnalysisProvider implements AnalysisProvider {
  readonly #cases = new Map<string, RecordedAnalysisCase>();
  readonly #submissions = new Map<string, RecordedSubmission>();

  constructor(cases: readonly RecordedAnalysisCase[]) {
    const ids = new Set<string>();
    for (const recordedCase of cases) {
      if (ids.has(recordedCase.id)) {
        throw new Error(`Duplicate recorded analysis case: ${recordedCase.id}`);
      }
      ids.add(recordedCase.id);

      const key = caseKey(recordedCase.articleText, recordedCase.checkedAt);
      if (this.#cases.has(key)) {
        throw new Error(
          `Recorded analysis cases must have unique article/check-date pairs: ${recordedCase.id}`,
        );
      }
      this.#cases.set(key, structuredClone(recordedCase));
    }
  }

  async start(request: AnalysisRequest): Promise<AnalysisSubmission> {
    const recordedCase = this.#cases.get(
      caseKey(request.articleText, request.checkedAt),
    );
    if (!recordedCase) {
      throw new Error("No recorded analysis case matches this request");
    }

    const providerRunId = `recorded:${recordedCase.id}:${request.runId}`;
    this.#submissions.set(providerRunId, {
      request: structuredClone(request),
      recordedCase,
    });
    return { providerRunId };
  }

  async retrieve(providerRunId: string): Promise<AnalysisOutput> {
    const submission = this.#submissions.get(providerRunId);
    if (!submission) {
      throw new Error("Unknown recorded analysis submission");
    }

    return parseAndValidateAnalysisOutput({
      articleText: submission.request.articleText,
      checkedAt: submission.request.checkedAt,
      rawOutput: structuredClone(submission.recordedCase.rawOutput),
      evidence: structuredClone(submission.recordedCase.evidence),
    });
  }
}
