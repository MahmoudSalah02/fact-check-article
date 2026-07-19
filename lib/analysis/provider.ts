import type { AnalysisOutput } from "@/lib/contracts";

export type AnalysisRequest = {
  runId: string;
  articleText: string;
  checkedAt: string;
};

export type AnalysisSubmission = {
  providerRunId: string;
};

export interface AnalysisProvider {
  start(request: AnalysisRequest): Promise<AnalysisSubmission>;
  retrieve(providerRunId: string): Promise<AnalysisOutput>;
}
